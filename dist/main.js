"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const terraform_1 = require("./terraform");
const parser_1 = require("./parser");
const mermaid_1 = require("./mermaid");
const render_1 = require("./render");
const github_1 = require("./github");
async function run() {
    try {
        const workingDirectory = core.getInput('working-directory', { required: false }) || '.';
        const terraformVersion = core.getInput('terraform-version', { required: false }) || '1.7.5';
        const planArgs = core.getInput('plan-args', { required: false }) || '-no-color -out=plan.out';
        const varFile = core.getInput('var-file', { required: false });
        const infracostEnabled = core.getBooleanInput('infracost-enabled', { required: false });
        const policyEnabled = core.getBooleanInput('policy-enabled', { required: false });
        const maxDestroy = parseInt(core.getInput('max-destroy', { required: false }) || '0');
        const maxReplace = parseInt(core.getInput('max-replace', { required: false }) || '0');
        core.info('Starting Terraform Plan Visualizer...');
        core.info('Running Terraform plan...');
        const planJson = await (0, terraform_1.runTerraformPlan)({
            workingDirectory,
            terraformVersion,
            planArgs,
            varFile,
            infracostEnabled,
            policyEnabled
        });
        core.info('Parsing Terraform plan...');
        const planData = (0, parser_1.parsePlan)(planJson);
        core.info('Generating Mermaid diagram...');
        const mermaidDiagram = (0, mermaid_1.generateMermaidDiagram)(planData);
        core.info('Rendering PR comment...');
        const comment = (0, render_1.renderComment)({
            mermaidDiagram,
            planData,
            infracostEnabled,
            policyEnabled
        });
        core.info('Posting PR comment...');
        const commentUrl = await (0, github_1.postStickyComment)(comment);
        core.setOutput('comment-url', commentUrl);
        core.setOutput('create-count', planData.summary.create.toString());
        core.setOutput('update-count', planData.summary.update.toString());
        core.setOutput('replace-count', planData.summary.replace.toString());
        core.setOutput('destroy-count', planData.summary.destroy.toString());
        const hasRisk = (maxDestroy > 0 && planData.summary.destroy > maxDestroy) ||
            (maxReplace > 0 && planData.summary.replace > maxReplace);
        core.setOutput('has-risk', hasRisk.toString());
        if (hasRisk) {
            core.setFailed(`Plan contains risky changes: ${planData.summary.destroy} destroys, ${planData.summary.replace} replaces`);
        }
        core.info('Terraform Plan Visualizer completed successfully!');
    }
    catch (error) {
        core.setFailed(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
run();
//# sourceMappingURL=main.js.map