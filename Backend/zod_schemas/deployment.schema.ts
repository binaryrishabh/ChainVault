import * as z from "zod";
import { DEPLOYMENT_CHAOS } from "@shared/constants/DEPLOYMENT_CHAOS.constants";

export const ChaosInjectionBodySchema = z.object({
  type: z.enum(DEPLOYMENT_CHAOS, "Must be of the specified chaos type only"),
  resourceId: z.string("Must be of a string type")
})

export const DeploymentIdSchema = z.object({
  deploymentId: z.string("Must be a string").uuid("Invalid deployment id schema")
});

export type ChaosInjectionBodySchemaType = z.infer<typeof ChaosInjectionBodySchema>;
export type DeploymentIdSchemaType = z.infer<typeof DeploymentIdSchema>;