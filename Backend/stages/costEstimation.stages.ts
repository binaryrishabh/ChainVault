import type { Resource, StageResult } from "../../shared/types";

export const runCostEstimation = (resources: Resource[]): StageResult => {
  const pricing: Record<string, number> = {
    "Virtual Machine": 15,   // ~$15/month for a small AWS EC2 (t3.small)
    "Database": 40,          // ~$40/month for a small RDS instance
    "Load Balancer": 20,     // ~$20/month for AWS ALB
    "Object Storage": 5,     // ~$5/month for 100GB S3
    "CDN": 10,               // ~$10/month for CloudFront (low traffic)
    "Cache": 25,             // ~$25/month for Redis ElastiCache (small)
    "Message Queue": 30,     // ~$30/month for SQS/SNS or RabbitMQ
    "DNS": 3,                // ~$3/month for Route 53
    "Firewall": 10,          // ~$10/month for AWS WAF (basic)
    "Container Registry": 15, // ~$15/month for ECR
    "Monitoring Agent": 8,   // ~$8/month for CloudWatch (basic)
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