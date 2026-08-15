import type { Resource } from "./Resource.types";
import type { ConnectionLine } from "./ConnectionLine.types";

export interface Infrastructure {
  id: string;
  userId: string;
  name: string;
  layout: {
    resources: Resource[],
    connectionLines?: ConnectionLine[]
  };
  createdAt: string;
  updatedAt: string;
}