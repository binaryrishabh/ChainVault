import * as z from "zod";

export const InfrastructureBodySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(30, "Name must be at most 20 characters"),
  layout: z.record(z.string(), z.any())
})

export const UpdateInfrastructureBodySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(30, "Name must be at most 20 characters").optional(),
  layout: z.record(z.string(), z.any()).optional()
}).refine(
  (data) => data.name !== undefined || data.layout !== undefined,
  { message: "At least one field (name or layout) must be provided" }
)

export const InfrastructureIdSchema = z.object({
  infrastructureId: z.string().uuid("Invalid Infrastructure id format")
})

export type InfrastructureBodySchemaType = z.infer<typeof InfrastructureBodySchema>
export type UpdateInfrastructureBodySchema = z.infer<typeof UpdateInfrastructureBodySchema>
export type IdType = z.infer<typeof InfrastructureIdSchema>