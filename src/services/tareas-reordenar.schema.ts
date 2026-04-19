import { z } from "zod";

export const tareasReordenarBodySchema = z.object({
  faseColumnKey: z.string().min(1).max(120),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        orden: z.number().int().min(1).max(9999),
      }),
    )
    .min(1)
    .max(200),
});

export type TareasReordenarBody = z.infer<typeof tareasReordenarBodySchema>;
