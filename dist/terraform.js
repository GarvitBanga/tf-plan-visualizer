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
exports.runTerraformPlan = runTerraformPlan;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
async function runTerraformPlan(options) {
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
                stdout: (data) => {
                    planJson += data.toString();
                }
            }
        });
        const plan = JSON.parse(planJson);
        if (infracostEnabled) {
            core.info('Running Infracost analysis...');
            try {
                await runInfracost(workingDirectory);
            }
            catch (error) {
                core.warning(`Infracost failed: ${error}`);
            }
        }
        if (policyEnabled) {
            core.info('Running policy checks...');
            try {
                await runPolicyChecks(workingDirectory);
            }
            catch (error) {
                core.warning(`Policy checks failed: ${error}`);
            }
        }
        return plan;
    }
    finally {
        try {
            await io.rmRF('plan.out');
        }
        catch (error) {
            core.debug(`Failed to clean up plan.out: ${error}`);
        }
        process.chdir(originalCwd);
    }
}
async function installTerraform(version) {
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
async function getTerraformVersion() {
    let version = '';
    await exec.exec('terraform', ['version'], {
        listeners: {
            stdout: (data) => {
                version += data.toString();
            }
        }
    });
    const match = version.match(/Terraform v(\d+\.\d+\.\d+)/);
    return match ? match[1] : '0.0.0';
}
async function runInfracost(workingDirectory) {
    // Placeholder for Infracost integration
    // This would install and run Infracost to generate cost estimates
    core.info('Infracost integration not yet implemented');
}
async function runPolicyChecks(workingDirectory) {
    // Placeholder for policy checks (Checkov, Conftest, etc.)
    // This would run security and compliance checks
    core.info('Policy checks integration not yet implemented');
}
//# sourceMappingURL=terraform.js.map