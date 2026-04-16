import { z } from "zod";

export const chatPostBodySchema = z.object({
  message: z.string().min(1, "El mensaje no puede estar vacio").max(8000),
  tareaId: z.string().uuid().optional().nullable(),
});

export type ChatPostBody = z.infer<typeof chatPostBodySchema>;
