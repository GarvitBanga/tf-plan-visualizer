"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderComment = renderComment;
exports.renderSimplifiedComment = renderSimplifiedComment;
function renderComment(options) {
    const { mermaidDiagram, planData, infracostEnabled, policyEnabled } = options;
    const { summary, risks } = planData;
    let comment = '## Terraform Plan Visualizer\n\n';
    // Add Mermaid diagram
    comment += '### Resource Graph\n\n';
    comment += mermaidDiagram + '\n\n';
    // Add change summary table
    comment += '### Change Summary\n\n';
    const { create, update, replace, destroy, noop } = summary;
    let table = '| Action | Count |\n';
    table += '|--------|-------|\n';
    if (create > 0) {
        table += `| + Create | ${create} |\n`;
    }
    if (update > 0) {
        table += `| ~ Update | ${update} |\n`;
    }
    if (replace > 0) {
        table += `| ~ Replace | ${replace} WARNING |\n`;
    }
    if (destroy > 0) {
        table += `| - Destroy | ${destroy} WARNING |\n`;
    }
    if (noop > 0) {
        table += `| - No-op | ${noop} |\n`;
    }
    comment += table + '\n';
    // Add risk warnings if any
    if (risks.length > 0) {
        comment += '### Risk Warnings\n\n';
        let warnings = '';
        const destroys = risks.filter(r => r.type === 'destroy');
        const replaces = risks.filter(r => r.type === 'replace');
        if (destroys.length > 0) {
            warnings += '**Resources to be destroyed:**\n';
            destroys.forEach(risk => {
                warnings += `- - \`${risk.resource}\`${risk.reason ? ` (${risk.reason})` : ''}\n`;
            });
            warnings += '\n';
        }
        if (replaces.length > 0) {
            warnings += '**Resources to be replaced:**\n';
            replaces.forEach(risk => {
                warnings += `- ~ \`${risk.resource}\`${risk.reason ? ` (${risk.reason})` : ''}\n`;
            });
            warnings += '\n';
        }
        comment += warnings;
    }
    // Add top changes
    if (summary.create + summary.update + summary.replace + summary.destroy > 0) {
        comment += '### Top Changes\n\n';
        const topChanges = getTopChanges(planData.resources, 10);
        topChanges.forEach(resource => {
            const symbol = getActionSymbol(resource.actions);
            comment += `- ${symbol} \`${resource.address}\` ${resource.actions[0]}\n`;
        });
        comment += '\n';
    }
    // Add Infracost section if enabled
    if (infracostEnabled) {
        comment += '### Cost Analysis\n\n';
        comment += '*Infracost integration coming soon*\n\n';
    }
    // Add policy checks section if enabled
    if (policyEnabled) {
        comment += '### Policy Checks\n\n';
        comment += '*Policy checks integration coming soon*\n\n';
    }
    return comment;
}
function getActionSymbol(actions) {
    if (actions.includes('delete')) {
        return '-';
    }
    if (actions.includes('create') && actions.includes('delete')) {
        return '~';
    }
    if (actions.includes('create')) {
        return '+';
    }
    if (actions.includes('update')) {
        return '~';
    }
    return '-';
}
function getTopChanges(resources, maxCount) {
    // Sort by priority: destroy > replace > create > update
    const priority = { delete: 4, create: 3, update: 2 };
    return resources
        .filter(r => r.actions.length > 0 && !r.actions.includes('no-op'))
        .sort((a, b) => {
        const aPriority = Math.max(...a.actions.map((action) => priority[action] || 0));
        const bPriority = Math.max(...b.actions.map((action) => priority[action] || 0));
        return bPriority - aPriority;
    })
        .slice(0, maxCount);
}
// Generate a simplified comment for large plans
function renderSimplifiedComment(options) {
    const { planData } = options;
    const { summary } = planData;
    const { create, update, replace, destroy } = summary;
    let comment = '## Terraform Plan Visualizer (Simplified)\n\n';
    comment += '### Summary\n\n';
    if (create > 0)
        comment += `- + **${create}** resources to create\n`;
    if (update > 0)
        comment += `- ~ **${update}** resources to update\n`;
    if (replace > 0)
        comment += `- ~ **${replace}** resources to replace WARNING\n`;
    if (destroy > 0)
        comment += `- - **${destroy}** resources to destroy WARNING\n`;
    comment += '\n*This is a simplified view. See the full plan for details.*\n';
    return comment;
}
//# sourceMappingURL=render.js.map