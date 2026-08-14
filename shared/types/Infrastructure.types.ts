import type { Resource } from "./Resource.types";

export interface Infrastructure {
  id: string;
  userId: string;
  name: string;
  layout: {
    resources: Resource[]
  };
  createdAt: string;
  updatedAt: string;
}