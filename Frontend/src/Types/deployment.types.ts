export interface Deployment {
  id: string,
  infrastructureId: string,
  status: string,
  resourceCount: number,
  stages: [],
  timeline: [],
  chaosEvents: [],
  createdAt: string,
  updatedAt: string
}