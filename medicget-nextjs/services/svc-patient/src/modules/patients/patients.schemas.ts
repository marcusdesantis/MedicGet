import { z } from 'zod';

export const updatePatientSchema = z
  .object({
    dateOfBirth: z.string().datetime().optional(),
    bloodType: z.string().optional(),
    allergies: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })
  .strict();

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
