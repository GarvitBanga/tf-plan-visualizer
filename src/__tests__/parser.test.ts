import { parsePlan } from '../parser';
import { TerraformPlan } from '../types';

describe('parsePlan', () => {
  it('should parse a basic create plan', () => {
    const mockPlan: TerraformPlan = {
      format_version: '1.0',
      terraform_version: '1.7.5',
      planned_values: {
        root_module: {
          resources: [],
          child_modules: []
        }
      },
      resource_changes: [
        {
          address: 'aws_instance.web',
          type: 'aws_instance',
          name: 'web',
          mode: 'managed',
          provider_name: 'aws',
          change: {
            actions: ['create'],
            before: null,
            after: {},
            after_unknown: {},
            before_sensitive: {},
            after_sensitive: {}
          }
        }
      ],
      configuration: {
        provider_config: {},
        root_module: {
          resources: [],
          child_modules: []
        }
      }
    };

    const result = parsePlan(mockPlan);

    expect(result.summary.create).toBe(1);
    expect(result.summary.update).toBe(0);
    expect(result.summary.replace).toBe(0);
    expect(result.summary.destroy).toBe(0);
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].address).toBe('aws_instance.web');
    expect(result.resources[0].actions).toEqual(['create']);
  });

  it('should parse a plan with multiple changes', () => {
    const mockPlan: TerraformPlan = {
      format_version: '1.0',
      terraform_version: '1.7.5',
      planned_values: {
        root_module: {
          resources: [],
          child_modules: []
        }
      },
      resource_changes: [
        {
          address: 'aws_instance.web',
          type: 'aws_instance',
          name: 'web',
          mode: 'managed',
          provider_name: 'aws',
          change: {
            actions: ['create'],
            before: null,
            after: {},
            after_unknown: {},
            before_sensitive: {},
            after_sensitive: {}
          }
        },
        {
          address: 'aws_instance.db',
          type: 'aws_instance',
          name: 'db',
          mode: 'managed',
          provider_name: 'aws',
          change: {
            actions: ['update'],
            before: {},
            after: {},
            after_unknown: {},
            before_sensitive: {},
            after_sensitive: {}
          }
        },
        {
          address: 'aws_instance.old',
          type: 'aws_instance',
          name: 'old',
          mode: 'managed',
          provider_name: 'aws',
          change: {
            actions: ['delete'],
            before: {},
            after: null,
            after_unknown: {},
            before_sensitive: {},
            after_sensitive: {}
          }
        }
      ],
      configuration: {
        provider_config: {},
        root_module: {
          resources: [],
          child_modules: []
        }
      }
    };

    const result = parsePlan(mockPlan);

    expect(result.summary.create).toBe(1);
    expect(result.summary.update).toBe(1);
    expect(result.summary.destroy).toBe(1);
    expect(result.resources).toHaveLength(3);
  });

  it('should handle empty plan', () => {
    const mockPlan: TerraformPlan = {
      format_version: '1.0',
      terraform_version: '1.7.5',
      planned_values: {
        root_module: {
          resources: [],
          child_modules: []
        }
      },
      resource_changes: [],
      configuration: {
        provider_config: {},
        root_module: {
          resources: [],
          child_modules: []
        }
      }
    };

    const result = parsePlan(mockPlan);

    expect(result.summary.create).toBe(0);
    expect(result.summary.update).toBe(0);
    expect(result.summary.replace).toBe(0);
    expect(result.summary.destroy).toBe(0);
    expect(result.resources).toHaveLength(0);
  });

  it('should identify risks correctly', () => {
    const mockPlan: TerraformPlan = {
      format_version: '1.0',
      terraform_version: '1.7.5',
      planned_values: {
        root_module: {
          resources: [],
          child_modules: []
        }
      },
      resource_changes: [
        {
          address: 'aws_instance.web',
          type: 'aws_instance',
          name: 'web',
          mode: 'managed',
          provider_name: 'aws',
          change: {
            actions: ['delete'],
            before: {},
            after: null,
            after_unknown: {},
            before_sensitive: {},
            after_sensitive: {}
          }
        },
        {
          address: 'aws_instance.db',
          type: 'aws_instance',
          name: 'db',
          mode: 'managed',
          provider_name: 'aws',
          change: {
            actions: ['create', 'delete'],
            before: {},
            after: {},
            after_unknown: {},
            before_sensitive: {},
            after_sensitive: {}
          }
        }
      ],
      configuration: {
        provider_config: {},
        root_module: {
          resources: [],
          child_modules: []
        }
      }
    };

    const result = parsePlan(mockPlan);

    expect(result.risks).toHaveLength(2);
    const riskTypes = result.risks.map(r => r.type);
    const riskResources = result.risks.map(r => r.resource);
    expect(riskTypes).toContain('destroy');
    expect(riskTypes).toContain('replace');
    expect(riskResources).toContain('aws_instance.web');
    expect(riskResources).toContain('aws_instance.db');
  });
}); 