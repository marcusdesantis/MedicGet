import { z } from 'zod';

export const updatePatientSchema = z
  .object({
    // Accept full ISO datetime OR a YYYY-MM-DD date — date inputs in the
    // browser submit `2000-05-15` and we don't want to force the client to
    // append a time. Prisma will coerce to a Date either way.
    dateOfBirth: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date').optional(),
    bloodType:   z.string().optional(),
    allergies:   z.array(z.string()).optional(),
    conditions:  z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    notes:       z.string().optional(),
  })
  .strict();

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
