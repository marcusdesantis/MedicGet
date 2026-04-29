import { z } from 'zod';

export const updateDoctorSchema = z
  .object({
    specialty: z.string().optional(),
    experience: z.number().int().min(0).optional(),
    pricePerConsult: z.number().positive().optional(),
    bio: z.string().optional(),
    consultDuration: z.number().int().min(5).optional(),
    languages: z.array(z.string()).optional(),
    available: z.boolean().optional(),
    licenseNumber: z.string().optional(),
  })
  .strict();

export const availabilitySchema = z.object({
  dayOfWeek: z.enum([
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
