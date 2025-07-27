import { TerraformPlan, PlanData, ParsedResource, Edge, Risk, ModuleInfo, ChangeSummary } from './types';

export function parsePlan(planJson: TerraformPlan): PlanData {
  const resources: ParsedResource[] = [];
  const edges: Edge[] = [];
  const risks: Risk[] = [];
  const modules: ModuleInfo[] = [];

  // Parse resource changes
  for (const change of planJson.resource_changes) {
    const resource = parseResourceChange(change);
    resources.push(resource);

    // Check for risks
    if (change.change.actions.includes('create') && change.change.actions.includes('delete')) {
      risks.push({
        type: 'replace',
        resource: change.address,
        reason: change.action_reason
      });
    } else if (change.change.actions.includes('delete')) {
      risks.push({
        type: 'destroy',
        resource: change.address,
        reason: change.action_reason
      });
    }
  }

  // Parse configuration to get dependencies and module structure
  parseConfiguration(planJson.configuration, resources, edges, modules);

  // Calculate summary
  const summary = calculateSummary(resources);

  return {
    summary,
    resources,
    edges,
    risks,
    modules
  };
}

function parseResourceChange(change: any): ParsedResource {
  const address = change.address;
  const modulePath = change.module_address || '';
  const type = change.type;
  const name = change.name;
  const actions = change.change.actions;
  const isData = change.mode === 'data';

  // Extract depends_on from planned values if available
  const dependsOn: string[] = [];
  if (change.change.after && change.change.after.depends_on) {
    dependsOn.push(...change.change.after.depends_on);
  }

  return {
    address,
    modulePath,
    type,
    name,
    actions,
    isData,
    dependsOn
  };
}

function parseConfiguration(
  config: any,
  resources: ParsedResource[],
  edges: Edge[],
  modules: ModuleInfo[]
): void {
  // Parse root module
  parseModule(config.root_module, '', resources, edges, modules);

  // Parse child modules
  for (const childModule of config.root_module.child_modules || []) {
    parseModule(childModule, childModule.address, resources, edges, modules);
  }
}

function parseModule(
  module: any,
  modulePath: string,
  resources: ParsedResource[],
  edges: Edge[],
  modules: ModuleInfo[]
): void {
  const moduleResources: string[] = [];

  // Parse resources in this module
  for (const resource of module.resources || []) {
    const address = resource.address;
    moduleResources.push(address);

    // Extract depends_on relationships
    if (resource.depends_on) {
      for (const dep of resource.depends_on) {
        edges.push({
          from: address,
          to: dep,
          type: 'depends_on'
        });
      }
    }

    // Extract references from expressions (best effort)
    extractReferencesFromExpressions(resource.expressions, address, edges);
  }

  // Add module info
  if (moduleResources.length > 0) {
    modules.push({
      path: modulePath,
      resources: moduleResources
    });
  }

  // Parse child modules
  for (const childModule of module.child_modules || []) {
    const childPath = modulePath ? `${modulePath}.${childModule.address}` : childModule.address;
    parseModule(childModule, childPath, resources, edges, modules);
  }
}

function extractReferencesFromExpressions(
  expressions: Record<string, any>,
  resourceAddress: string,
  edges: Edge[]
): void {
  if (!expressions) return;

  for (const [key, expr] of Object.entries(expressions)) {
    if (typeof expr === 'object' && expr !== null) {
      // Look for references in the expression
      const references = findReferencesInExpression(expr);
      for (const ref of references) {
        edges.push({
          from: resourceAddress,
          to: ref,
          type: 'reference'
        });
      }
    }
  }
}

function findReferencesInExpression(expr: any): string[] {
  const references: string[] = [];

  if (typeof expr === 'string') {
    // Look for resource references like "aws_instance.web.id"
    const refMatches = expr.match(/\b[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\b/g);
    if (refMatches) {
      references.push(...refMatches);
    }
  } else if (Array.isArray(expr)) {
    for (const item of expr) {
      references.push(...findReferencesInExpression(item));
    }
  } else if (typeof expr === 'object' && expr !== null) {
    for (const value of Object.values(expr)) {
      references.push(...findReferencesInExpression(value));
    }
  }

  return references;
}

function calculateSummary(resources: ParsedResource[]): ChangeSummary {
  const summary: ChangeSummary = {
    create: 0,
    update: 0,
    replace: 0,
    destroy: 0,
    noop: 0
  };

  for (const resource of resources) {
    if (resource.isData) continue; // Skip data sources

    const actions = resource.actions;
    
    if (actions.includes('create') && actions.includes('delete')) {
      summary.replace++;
    } else if (actions.includes('create')) {
      summary.create++;
    } else if (actions.includes('update')) {
      summary.update++;
    } else if (actions.includes('delete')) {
      summary.destroy++;
    } else if (actions.includes('no-op')) {
      summary.noop++;
    }
  }

  return summary;
}

// Helper function to get resources by module
export function getResourcesByModule(resources: ParsedResource[]): Record<string, ParsedResource[]> {
  const byModule: Record<string, ParsedResource[]> = {};

  for (const resource of resources) {
    const module = resource.modulePath || 'root';
    if (!byModule[module]) {
      byModule[module] = [];
    }
    byModule[module].push(resource);
  }

  return byModule;
}

// Helper function to get top changes (most impactful)
export function getTopChanges(resources: ParsedResource[], limit: number = 10): ParsedResource[] {
  return resources
    .filter(r => !r.isData) // Skip data sources
    .sort((a, b) => {
      // Prioritize destroys and replaces
      const aPriority = getActionPriority(a.actions);
      const bPriority = getActionPriority(b.actions);
      return bPriority - aPriority;
    })
    .slice(0, limit);
}

function getActionPriority(actions: string[]): number {
  if (actions.includes('delete')) return 4;
  if (actions.includes('create') && actions.includes('delete')) return 3;
  if (actions.includes('create')) return 2;
  if (actions.includes('update')) return 1;
  return 0;
} 