import { RESOURCE_TYPES } from "@shared/constants/RESOURCE_TYPES.constants";
import type { Resource } from "@shared/types/Resource.types";
import type { StageResult } from "@shared/types/StageResult.types";

export const runCostEstimation = (resources: Resource[]): StageResult => {
  const pricing: Record<string, number> = {
    [RESOURCE_TYPES.DNS]: 3,                // ~$3/month for Route 53
    [RESOURCE_TYPES.CDN]: 10,               // ~$10/month for CloudFront (low traffic)
    [RESOURCE_TYPES.Firewall]: 10,          // ~$10/month for AWS WAF (basic)
    [RESOURCE_TYPES.LoadBalancer]: 20,     // ~$20/month for AWS ALB
    [RESOURCE_TYPES.VirtualMachine]: 15,   // ~$15/month for a small AWS EC2 (t3.small)
    [RESOURCE_TYPES.ContainerRegistry]: 15, // ~$15/month for ECR
    [RESOURCE_TYPES.Cache]: 25,             // ~$25/month for Redis ElastiCache (small)
    [RESOURCE_TYPES.Database]: 40,          // ~$40/month for a small RDS instance
    [RESOURCE_TYPES.MessageQueue]: 30,     // ~$30/month for SQS/SNS or RabbitMQ
    [RESOURCE_TYPES.ObjectStorage]: 5,     // ~$5/month for 100GB S3
    [RESOURCE_TYPES.MonitoringAgent]: 8,   // ~$8/month for CloudWatch (basic)
  }

  let monthlyEstimate = 0;
  const breakdown: Record<string, number> = {};

  for (const resource of resources) {
    const cost = pricing[resource.type] || 10; // Default $10 for unknown types
    monthlyEstimate += cost;
    breakdown[resource.type] = (breakdown[resource.type] || 0) + cost;
  }

  return {
    status: "passed",
    summary: `Estimated monthly cost: $${monthlyEstimate}`,
    details: { monthlyEstimate, breakdown }
  }
}