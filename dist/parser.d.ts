import { TerraformPlan, PlanData, ParsedResource } from './types';
export declare function parsePlan(planJson: TerraformPlan): PlanData;
export declare function getResourcesByModule(resources: ParsedResource[]): Record<string, ParsedResource[]>;
export declare function getTopChanges(resources: ParsedResource[], limit?: number): ParsedResource[];
//# sourceMappingURL=parser.d.ts.map