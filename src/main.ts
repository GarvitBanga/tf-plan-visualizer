import * as core from '@actions/core';
import { runTerraformPlan } from './terraform';
import { parsePlan } from './parser';
import { generateMermaidDiagram } from './mermaid';
import { renderComment } from './render';
import { postStickyComment } from './github';

async function run(): Promise<void> {
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
    const planJson = await runTerraformPlan({
      workingDirectory,
      terraformVersion,
      planArgs,
      varFile,
      infracostEnabled,
      policyEnabled
    });

    core.info('Parsing Terraform plan...');
    const planData = parsePlan(planJson);

    core.info('Generating Mermaid diagram...');
    const mermaidDiagram = generateMermaidDiagram(planData);

    core.info('Rendering PR comment...');
    const comment = renderComment({
      mermaidDiagram,
      planData,
      infracostEnabled,
      policyEnabled
    });

    core.info('Posting PR comment...');
    const commentUrl = await postStickyComment(comment);

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

  } catch (error) {
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run(); 