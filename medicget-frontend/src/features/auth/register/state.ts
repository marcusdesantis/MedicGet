/**
 * Registration wizard state — persisted to sessionStorage so the user can
 * navigate between steps (or refresh the tab) without losing what they
 * already filled in. Cleared automatically once the registration succeeds.
 *
 * Each role has its own slot so a user starting a doctor flow doesn't see
 * stale values from an abandoned clinic flow.
 */

import { useCallback, useEffect, useState } from "react";

export type RegistrationRole = "patient" | "doctor" | "clinic";

const STORAGE_KEY = "medicget.registration";

// ─── Per-role draft shapes ──────────────────────────────────────────────────
// Strings only: every field is held as a string in form state and converted
// at submit time. `undefined` means "not yet visited"; empty string means
// "visited and cleared".

export interface PatientDraft {
  firstName:    string;
  lastName:     string;
  email:        string;
  confirmEmail: string;
  password:     string;
  marketing:    boolean;
}

export interface DoctorDraft {
  // Step 1 — RegisterProfessionalPage
  name:      string;
  lastname:  string;
  specialty: string;
  location:  string;
  phone:     string;
  email:     string;
  password:  string;
  terms:     boolean;
  // Step 2 — RegisterAddressPage
  consultName: string;
  address:     string;
  city:        string;
  zip:         string;
  lat:         number | null;
  lng:         number | null;
}

export interface ClinicDraft {
  // Step 1 — RegisterClinicPage
  clinicName:  string;
  specialists: string;
  city:        string;
  software:    string;
  // Step 2 — RegisterClinicDetailsPage
  name:                 string;
  lastname:             string;
  role:                 string;
  email:                string;
  confirmEmail:         string;
  phone:                string;
  password:             string;
  confirmPassword:      string;
  acceptTerms:          boolean;
  confirmAuthorization: boolean;
}

type DraftMap = {
  patient: PatientDraft;
  doctor:  DoctorDraft;
  clinic:  ClinicDraft;
};

const EMPTY: DraftMap = {
  patient: { firstName: "", lastName: "", email: "", confirmEmail: "", password: "", marketing: false },
  doctor:  {
    name: "", lastname: "", specialty: "", location: "", phone: "",
    email: "", password: "", terms: false,
    consultName: "", address: "", city: "", zip: "", lat: null, lng: null,
  },
  clinic:  {
    clinicName: "", specialists: "", city: "", software: "",
    name: "", lastname: "", role: "", email: "", confirmEmail: "",
    phone: "", password: "", confirmPassword: "",
    acceptTerms: false, confirmAuthorization: false,
  },
};

// ─── Storage helpers ────────────────────────────────────────────────────────

function readAll(): DraftMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<DraftMap>;
    return {
      patient: { ...EMPTY.patient, ...(parsed.patient ?? {}) },
      doctor:  { ...EMPTY.doctor,  ...(parsed.doctor  ?? {}) },
      clinic:  { ...EMPTY.clinic,  ...(parsed.clinic  ?? {}) },
    };
  } catch {
    return EMPTY;
  }
}

function writeAll(map: DraftMap): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // sessionStorage may be unavailable (private mode, quota); fail silently.
  }
}

export function clearRegistrationDraft(): void {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Returns the current draft for `role`, plus a setter that merges partial
 * updates and persists immediately. Use it from every wizard step.
 *
 *   const [draft, setDraft] = useRegistrationDraft("doctor");
 *   setDraft({ specialty: "Cardiología" });
 */
export function useRegistrationDraft<R extends RegistrationRole>(role: R): [
  DraftMap[R],
  (patch: Partial<DraftMap[R]>) => void,
] {
  const [draft, setDraftState] = useState<DraftMap[R]>(() => readAll()[role]);

  // Re-hydrate when the role changes (e.g. a user navigates back to the
  // role picker and picks a different role).
  useEffect(() => {
    setDraftState(readAll()[role]);
  }, [role]);

  const setDraft = useCallback(
    (patch: Partial<DraftMap[R]>) => {
      setDraftState((prev) => {
        const next = { ...prev, ...patch };
        const all  = readAll();
        all[role]  = next;
        writeAll(all);
        return next;
      });
    },
    [role],
  );

  return [draft, setDraft];
}
