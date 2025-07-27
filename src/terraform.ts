import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as path from 'path';
import { TerraformOptions } from './types';

export async function runTerraformPlan(options: TerraformOptions): Promise<any> {
  const { workingDirectory, terraformVersion, planArgs, varFile, infracostEnabled, policyEnabled } = options;

  await installTerraform(terraformVersion);

  const originalCwd = process.cwd();
  process.chdir(workingDirectory);

  try {
    core.info('Running terraform init...');
    await exec.exec('terraform', ['init', '-no-color']);

    const planCmd = ['plan', '-no-color', '-out=plan.out'];
    
    if (varFile) {
      const varFiles = varFile.split(',').map(f => f.trim());
      for (const vf of varFiles) {
        planCmd.push(`-var-file=${vf}`);
      }
    }

    if (planArgs) {
      const args = planArgs.split(' ').filter(arg => arg.trim());
      planCmd.push(...args);
    }

    core.info(`Running terraform plan...`);
    await exec.exec('terraform', planCmd);

    core.info('Converting plan to JSON...');
    let planJson = '';
    await exec.exec('terraform', ['show', '-json', 'plan.out'], {
      listeners: {
        stdout: (data: Buffer) => {
          planJson += data.toString();
        }
      }
    });

    const plan = JSON.parse(planJson);

    if (infracostEnabled) {
      core.info('Running Infracost analysis...');
      try {
        await runInfracost(workingDirectory);
      } catch (error) {
        core.warning(`Infracost failed: ${error}`);
      }
    }

    if (policyEnabled) {
      core.info('Running policy checks...');
      try {
        await runPolicyChecks(workingDirectory);
      } catch (error) {
        core.warning(`Policy checks failed: ${error}`);
      }
    }

    return plan;

  } finally {
    try {
      await io.rmRF('plan.out');
    } catch (error) {
      core.debug(`Failed to clean up plan.out: ${error}`);
    }

    process.chdir(originalCwd);
  }
}

async function installTerraform(version: string): Promise<void> {
  core.info(`Installing Terraform ${version}...`);
  
  const terraformPath = await io.which('terraform', false);
  if (terraformPath) {
    const currentVersion = await getTerraformVersion();
    if (currentVersion.startsWith(version)) {
      core.info(`Terraform ${version} already installed`);
      return;
    }
  }

  // Download and install Terraform
  const platform = process.platform === 'win32' ? 'windows' : process.platform;
  const arch = process.arch === 'x64' ? 'amd64' : process.arch;
  const downloadUrl = `https://releases.hashicorp.com/terraform/${version}/terraform_${version}_${platform}_${arch}.zip`;

  core.info(`Downloading Terraform from ${downloadUrl}`);
  
  // Use hashicorp/setup-terraform action for installation
  await exec.exec('curl', ['-L', downloadUrl, '-o', 'terraform.zip']);
  await exec.exec('unzip', ['terraform.zip']);
  await exec.exec('chmod', ['+x', './terraform']);
  await exec.exec('sudo', ['mv', './terraform', '/usr/local/bin/']);
  await exec.exec('rm', ['terraform.zip']);
}

async function getTerraformVersion(): Promise<string> {
  let version = '';
  await exec.exec('terraform', ['version'], {
    listeners: {
      stdout: (data: Buffer) => {
        version += data.toString();
      }
    }
  });
  
  const match = version.match(/Terraform v(\d+\.\d+\.\d+)/);
  return match ? match[1] : '0.0.0';
}

async function runInfracost(workingDirectory: string): Promise<void> {
  // Placeholder for Infracost integration
  // This would install and run Infracost to generate cost estimates
  core.info('Infracost integration not yet implemented');
}

async function runPolicyChecks(workingDirectory: string): Promise<void> {
  // Placeholder for policy checks (Checkov, Conftest, etc.)
  // This would run security and compliance checks
  core.info('Policy checks integration not yet implemented');
} 