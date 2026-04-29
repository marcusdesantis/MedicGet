import { z } from 'zod';

export const createSchema = z.object({
  patientId: z.string().cuid(),
  doctorId:  z.string().cuid(),
  clinicId:  z.string().cuid(),
  date:      z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date'),
  time:      z.string().regex(/^\d{2}:\d{2}$/),
  price:     z.number().positive(),
  notes:     z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createSchema>;

export const updateSchema = z.object({
  status:       z.enum(['PENDING', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes:        z.string().optional(),
  cancelReason: z.string().optional(),
}).strict();

export type UpdateAppointmentInput = z.infer<typeof updateSchema>;

export const updatePaymentSchema = z.object({
  status:        z.enum(['PENDING', 'PAID', 'REFUNDED', 'FAILED']).optional(),
  method:        z.enum(['CASH', 'CARD', 'TRANSFER', 'PENDING']).optional(),
  transactionId: z.string().optional(),
  notes:         z.string().optional(),
}).strict();

export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export const reviewSchema = z.object({
  rating:   z.number().int().min(1).max(5),
  comment:  z.string().optional(),
  isPublic: z.boolean().optional(),
});

export type CreateReviewInput = z.infer<typeof reviewSchema>;
