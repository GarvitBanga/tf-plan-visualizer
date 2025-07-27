export interface TerraformPlan {
    format_version: string;
    terraform_version: string;
    planned_values: PlannedValues;
    resource_changes: ResourceChange[];
    configuration: Configuration;
}
export interface PlannedValues {
    root_module: Module;
}
export interface Module {
    resources: Resource[];
    child_modules: ChildModule[];
}
export interface ChildModule {
    address: string;
    resources: Resource[];
    child_modules: ChildModule[];
}
export interface Resource {
    address: string;
    mode: string;
    type: string;
    name: string;
    provider_name: string;
    schema_version: number;
    values: Record<string, any>;
    depends_on?: string[];
}
export interface ResourceChange {
    address: string;
    module_address?: string;
    mode: string;
    type: string;
    name: string;
    index?: number;
    provider_name: string;
    change: Change;
    action_reason?: string;
}
export interface Change {
    actions: string[];
    before: Record<string, any> | null;
    after: Record<string, any> | null;
    after_unknown: Record<string, any>;
    before_sensitive: Record<string, any>;
    after_sensitive: Record<string, any>;
}
export interface Configuration {
    provider_config: Record<string, any>;
    root_module: ConfigurationModule;
}
export interface ConfigurationModule {
    resources: ConfigurationResource[];
    child_modules: ConfigurationChildModule[];
}
export interface ConfigurationResource {
    address: string;
    mode: string;
    type: string;
    name: string;
    provider_config_key: string;
    expressions: Record<string, any>;
    depends_on?: string[];
}
export interface ConfigurationChildModule {
    address: string;
    source: string;
    resources: ConfigurationResource[];
    child_modules: ConfigurationChildModule[];
}
export interface PlanData {
    summary: ChangeSummary;
    resources: ParsedResource[];
    edges: Edge[];
    risks: Risk[];
    modules: ModuleInfo[];
}
export interface ChangeSummary {
    create: number;
    update: number;
    replace: number;
    destroy: number;
    noop: number;
}
export interface ParsedResource {
    address: string;
    modulePath: string;
    type: string;
    name: string;
    actions: string[];
    isData: boolean;
    dependsOn: string[];
}
export interface Edge {
    from: string;
    to: string;
    type: 'depends_on' | 'reference';
}
export interface Risk {
    type: 'destroy' | 'replace';
    resource: string;
    reason?: string;
}
export interface ModuleInfo {
    path: string;
    resources: string[];
}
export interface TerraformOptions {
    workingDirectory: string;
    terraformVersion: string;
    planArgs: string;
    varFile?: string;
    infracostEnabled: boolean;
    policyEnabled: boolean;
}
export interface CommentOptions {
    mermaidDiagram: string;
    planData: PlanData;
    infracostEnabled: boolean;
    policyEnabled: boolean;
}
export interface InfracostResult {
    monthlyCost: string;
    delta: string;
    breakdown: any;
}
export interface PolicyResult {
    checkov: PolicyCheck[];
    conftest: PolicyCheck[];
}
export interface PolicyCheck {
    tool: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    file: string;
    line?: number;
}
//# sourceMappingURL=types.d.ts.map