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
    // Allowed appointment modalities — at least one must remain selected
    // (otherwise patients can't book at all). Validated as a non-empty
    // array of the canonical enum values.
    modalities: z
      .array(z.enum(['ONLINE', 'PRESENCIAL', 'CHAT']))
      .min(1, 'Debes aceptar al menos una modalidad')
      .optional(),
    // Allows a clinic admin OR the doctor themselves to associate / detach
    // a clinic. `null` means independent (unassociated). Cuid format when set.
    clinicId: z.union([z.string().cuid(), z.null()]).optional(),
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
