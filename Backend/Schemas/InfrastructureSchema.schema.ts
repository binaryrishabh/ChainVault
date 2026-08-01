import * as z from "zod";

export const InfrastructureSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters").max(30, "Name must be at most 20 characters"),
    layout: z.record(z.string(), z.any())
})

export const UpdateInfrastructureSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters").max(30, "Name must be at most 20 characters").optional(),
    layout: z.record(z.string(), z.any()).optional()
}).refine(
    (data) => data.name !== undefined || data.layout !== undefined,
    { message: "At least one field (name or layout) must be provided" }
)

export const IdSchema = z.object({
    id: z.string().uuid("Invalid id format")
})

export type InfrastructureSchemaType = z.infer<typeof InfrastructureSchema>
export type UpdateInfrastructureSchema = z.infer<typeof UpdateInfrastructureSchema>
export type IdType = z.infer<typeof IdSchema>
