export const RESOURCE_PORTS: Record<string, number> = {
  "DNS": 53,
  "CDN": 443,
  "Firewall": 0,
  "Load Balancer": 80,
  "Virtual Machine": 22,
  "Container Registry": 443,
  "Cache": 6379,
  "Database": 5432,
  "Object Storage": 0,
  "Message Queue": 5672,
  "Monitoring Agent": 9090,
} as const;

export type ResourcePortsType = typeof RESOURCE_PORTS;