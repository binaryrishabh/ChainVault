import * as z from "zod";
import { DeploymentChaosNames } from "@shared/enum/DeploymentChaosNames.enum";

export const ChaosInjectionBodySchema = z.object({
  type: z.enum(DeploymentChaosNames, "Must be of the specified chaos type only"),
  resourceId: z.string("Must be of a string type")
})

export const DeploymentIdSchema = z.object({
  deploymentId: z.string("Must be a string").uuid("Invalid deployment id schema")
});

export type ChaosInjectionBodySchemaType = z.infer<typeof ChaosInjectionBodySchema>;
export type DeploymentIdSchemaType = z.infer<typeof DeploymentIdSchema>;