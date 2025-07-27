"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMermaidDiagram = generateMermaidDiagram;
exports.generateSimplifiedDiagram = generateSimplifiedDiagram;
exports.generateModuleSummaryDiagram = generateModuleSummaryDiagram;
const parser_1 = require("./parser");
function generateMermaidDiagram(planData) {
    const { resources, edges, modules } = planData;
    // Filter out data sources for cleaner diagram
    const managedResources = resources.filter(r => !r.isData);
    if (managedResources.length === 0) {
        return '```mermaid\ngraph TD\n  A[No managed resources found] --> B[Plan may be empty or contain only data sources]\n```';
    }
    let mermaid = '```mermaid\ngraph TD\n';
    // Add nodes for each resource
    const nodeIds = new Map();
    let nodeCounter = 0;
    for (const resource of managedResources) {
        const nodeId = `node_${nodeCounter++}`;
        nodeIds.set(resource.address, nodeId);
        const label = getResourceLabel(resource);
        const style = getResourceStyle(resource);
        mermaid += `  ${nodeId}["${label}"]${style}\n`;
    }
    // Add edges
    for (const edge of edges) {
        const fromId = nodeIds.get(edge.from);
        const toId = nodeIds.get(edge.to);
        if (fromId && toId) {
            const edgeStyle = edge.type === 'depends_on' ? ' --> ' : ' -.-> ';
            mermaid += `  ${fromId}${edgeStyle}${toId}\n`;
        }
    }
    // Add module subgraphs if there are multiple modules
    const resourcesByModule = (0, parser_1.getResourcesByModule)(managedResources);
    const moduleNames = Object.keys(resourcesByModule).filter(name => name !== 'root');
    if (moduleNames.length > 0) {
        mermaid += '\n  %% Module groupings\n';
        for (const moduleName of moduleNames) {
            const moduleResources = resourcesByModule[moduleName];
            const moduleNodeIds = moduleResources
                .map(r => nodeIds.get(r.address))
                .filter(id => id !== undefined);
            if (moduleNodeIds.length > 0) {
                mermaid += `  subgraph ${moduleName.replace(/\./g, '_')}["${moduleName}"]\n`;
                for (const nodeId of moduleNodeIds) {
                    mermaid += `    ${nodeId}\n`;
                }
                mermaid += '  end\n';
            }
        }
    }
    mermaid += '```';
    return mermaid;
}
function getResourceLabel(resource) {
    const { type, name, actions } = resource;
    // Create a clean label
    let label = `${type}.${name}`;
    // Add action indicators
    const actionSymbols = [];
    if (actions.includes('create'))
        actionSymbols.push('+');
    if (actions.includes('update'))
        actionSymbols.push('~');
    if (actions.includes('delete'))
        actionSymbols.push('-');
    if (actions.includes('create') && actions.includes('delete'))
        actionSymbols.push('~');
    if (actionSymbols.length > 0) {
        label += ` ${actionSymbols.join('')}`;
    }
    return label;
}
function getResourceStyle(resource) {
    const { actions } = resource;
    // Apply different styles based on actions
    if (actions.includes('delete')) {
        return ':::destroy';
    }
    else if (actions.includes('create') && actions.includes('delete')) {
        return ':::replace';
    }
    else if (actions.includes('create')) {
        return ':::create';
    }
    else if (actions.includes('update')) {
        return ':::update';
    }
    return '';
}
// Generate a simplified diagram for large plans
function generateSimplifiedDiagram(planData, maxNodes = 50) {
    const { resources } = planData;
    const managedResources = resources.filter(r => !r.isData);
    if (managedResources.length <= maxNodes) {
        return generateMermaidDiagram(planData);
    }
    // Get top changes and a sample of other resources
    const topChanges = (0, parser_1.getTopChanges)(managedResources, Math.floor(maxNodes / 2));
    const otherResources = managedResources
        .filter(r => !topChanges.includes(r))
        .slice(0, maxNodes - topChanges.length);
    const selectedResources = [...topChanges, ...otherResources];
    // Create a simplified plan data structure
    const simplifiedPlanData = {
        ...planData,
        resources: selectedResources,
        edges: planData.edges.filter(edge => selectedResources.some(r => r.address === edge.from) &&
            selectedResources.some(r => r.address === edge.to))
    };
    let mermaid = '```mermaid\ngraph TD\n';
    mermaid += `  A["Large Plan Detected"] --> B["Showing ${selectedResources.length} of ${managedResources.length} resources"]\n`;
    mermaid += `  B --> C["Click to expand full diagram"]\n`;
    mermaid += `  style A fill:#fff3cd,stroke:#856404,stroke-width:2px\n`;
    mermaid += `  style B fill:#d1ecf1,stroke:#0c5460,stroke-width:2px\n`;
    mermaid += `  style C fill:#d4edda,stroke:#155724,stroke-width:2px\n`;
    mermaid += generateMermaidDiagram(simplifiedPlanData).replace('```mermaid\ngraph TD\n', '');
    return mermaid;
}
// Generate a summary diagram showing only modules and counts
function generateModuleSummaryDiagram(planData) {
    const { resources } = planData;
    const managedResources = resources.filter(r => !r.isData);
    const resourcesByModule = (0, parser_1.getResourcesByModule)(managedResources);
    let mermaid = '```mermaid\ngraph TD\n';
    for (const [moduleName, moduleResources] of Object.entries(resourcesByModule)) {
        const displayName = moduleName === 'root' ? 'Root Module' : moduleName;
        const counts = countActions(moduleResources);
        let label = `${displayName}\\n`;
        if (counts.create > 0)
            label += `+ ${counts.create} `;
        if (counts.update > 0)
            label += `~ ${counts.update} `;
        if (counts.replace > 0)
            label += `~ ${counts.replace} `;
        if (counts.destroy > 0)
            label += `- ${counts.destroy} `;
        const nodeId = moduleName.replace(/[^a-zA-Z0-9]/g, '_');
        const style = (counts.destroy > 0 || counts.replace > 0) ? ':::risk' : '';
        mermaid += `  ${nodeId}["${label}"]${style}\n`;
    }
    mermaid += '```';
    return mermaid;
}
function countActions(resources) {
    const counts = { create: 0, update: 0, replace: 0, destroy: 0 };
    for (const resource of resources) {
        const actions = resource.actions;
        if (actions.includes('create') && actions.includes('delete')) {
            counts.replace++;
        }
        else if (actions.includes('create')) {
            counts.create++;
        }
        else if (actions.includes('update')) {
            counts.update++;
        }
        else if (actions.includes('delete')) {
            counts.destroy++;
        }
    }
    return counts;
}
//# sourceMappingURL=mermaid.js.map