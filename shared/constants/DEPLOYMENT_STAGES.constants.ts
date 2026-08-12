export const DEPLOYMENT_STAGES = [
  "Validate",
  "Provision",
  "Configure",
  "Orchestrate",
  "HealthCheck",
  "SecurityScan",
  "CostEstimate",
  "MonitorSetup",
  "Ready"
] as const; // This tells to typescript that this array is readOnly and vakue are exact literals not just string[]. Without as const, the type is string[]. With it, the type is readonly ["Validate", "Provision", "Configure"].

export type DeploymentStagesType = (typeof DEPLOYMENT_STAGES)[number];
