export interface OutboxPayload {
  deploymentId: string;
  infrastructureId?: string;
  resources?: any[];
  chaosType?: string;
  resourceId?: string;
  message?: string;
}