/**
 * Estado del wizard de registro persistido en AsyncStorage.
 *
 * Replica el comportamiento de `register/state.ts` del frontend web —
 * cada rol tiene su propio slot para que el usuario pueda alternar
 * entre paciente/médico/clínica sin perder lo que ya capturó.
 *
 * Es asíncrono porque AsyncStorage en RN lo es. El hook
 * `useRegistrationDraft` encapsula la carga + persistencia y expone
 * `[draft, setDraft, ready]`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'medicget.registration';

export type RegistrationRole = 'patient' | 'doctor' | 'clinic';

// ─── Shapes ──────────────────────────────────────────────────────────────────

export interface PatientDraft {
  firstName: string;
  lastName: string;
  email: string;
  confirmEmail: string;
  password: string;
  marketing: boolean;
}

export interface DoctorDraft {
  // Paso 1 — Información personal/profesional
  name: string;
  lastname: string;
  specialty: string;
  phone: string;
  email: string;
  password: string;
  terms: boolean;
  // Paso 2 — Ubicación del consultorio
  consultName: string;
  country: string;
  province: string;
  address: string;
  city: string;
  zip: string;
  lat: number | null;
  lng: number | null;
}

export interface ClinicDraft {
  // Paso 1 — Datos de la clínica
  clinicName: string;
  specialists: string;
  city: string;
  // Paso 2 — Datos del responsable
  name: string;
  lastname: string;
  role: string;
  email: string;
  confirmEmail: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  confirmAuthorization: boolean;
  // Paso 3 — Ubicación de la clínica
  country: string;
  province: string;
  address: string;
  cityLocation: string;
  lat: number | null;
  lng: number | null;
}

export type DraftMap = {
  patient: PatientDraft;
  doctor: DoctorDraft;
  clinic: ClinicDraft;
};

const EMPTY: DraftMap = {
  patient: {
    firstName: '',
    lastName: '',
    email: '',
    confirmEmail: '',
    password: '',
    marketing: false,
  },
  doctor: {
    name: '',
    lastname: '',
    specialty: '',
    phone: '',
    email: '',
    password: '',
    terms: false,
    consultName: '',
    country: '',
    province: '',
    address: '',
    city: '',
    zip: '',
    lat: null,
    lng: null,
  },
  clinic: {
    clinicName: '',
    specialists: '',
    city: '',
    name: '',
    lastname: '',
    role: '',
    email: '',
    confirmEmail: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    confirmAuthorization: false,
    country: '',
    province: '',
    address: '',
    cityLocation: '',
    lat: null,
    lng: null,
  },
};

// ─── Storage helpers ─────────────────────────────────────────────────────────

async function readAll(): Promise<DraftMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<DraftMap>;
    return {
      patient: { ...EMPTY.patient, ...(parsed.patient ?? {}) },
      doctor: { ...EMPTY.doctor, ...(parsed.doctor ?? {}) },
      clinic: { ...EMPTY.clinic, ...(parsed.clinic ?? {}) },
    };
  } catch {
    return EMPTY;
  }
}

async function writeAll(map: DraftMap): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* silent */
  }
}

export async function clearRegistrationDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * `[draft, setDraft, ready]` — `ready` indica si la primera lectura de
 * AsyncStorage ya completó. Antes de eso `draft` contiene los defaults
 * vacíos; las pantallas pueden mostrar un spinner si lo necesitan.
 */
export function useRegistrationDraft<R extends RegistrationRole>(
  role: R,
): [DraftMap[R], (patch: Partial<DraftMap[R]>) => void, boolean] {
  const [draft, setDraftState] = useState<DraftMap[R]>(() => EMPTY[role]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const all = await readAll();
      if (mounted) {
        setDraftState(all[role]);
        setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [role]);

  const setDraft = useCallback(
    (patch: Partial<DraftMap[R]>) => {
      setDraftState((prev) => {
        const next = { ...prev, ...patch };
        readAll().then((all) => {
          all[role] = next;
          writeAll(all);
        });
        return next;
      });
    },
    [role],
  );

  return [draft, setDraft, ready];
}
