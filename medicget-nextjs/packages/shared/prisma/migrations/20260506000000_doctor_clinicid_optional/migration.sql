-- Make `Doctor.clinicId` optional so doctors can self-register and complete
-- their professional profile without immediately associating with a clinic.
-- The foreign key constraint stays (Postgres allows NULL on FK columns when
-- the column itself is nullable), so already-existing rows remain valid.

ALTER TABLE "Doctor" ALTER COLUMN "clinicId" DROP NOT NULL;
