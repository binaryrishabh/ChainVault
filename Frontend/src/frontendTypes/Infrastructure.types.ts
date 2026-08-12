import type { Resource } from "@shared/types/Resource.types";

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