/**
 * Catálogo por defecto de especialidades médicas.
 *
 * Se usa como fuente de sugerencias en el SpecialtyCombobox. El usuario
 * puede ignorarlo y escribir cualquier valor libre — esta lista existe
 * sólo para acelerar el alta de los casos más comunes.
 *
 * Cubre especialidades reconocidas por consejos médicos en LatAm/España.
 * Si una clínica trabaja con algo muy nicho (ej: "Medicina del Deporte
 * Pediátrica"), simplemente lo escribe y se guarda.
 */
export const DEFAULT_SPECIALTIES: string[] = [
  // Atención primaria y general
  'Medicina general',
  'Medicina familiar',
  'Medicina interna',
  'Medicina del trabajo',
  'Medicina del deporte',

  // Pediatría
  'Pediatría',
  'Neonatología',

  // Ginecología y reproducción
  'Ginecología y obstetricia',
  'Medicina reproductiva',

  // Cardiovascular
  'Cardiología',
  'Cirugía cardiovascular',
  'Hemodinamia',

  // Dermatología
  'Dermatología',
  'Dermatología pediátrica',

  // Endocrinología y metabolismo
  'Endocrinología',
  'Diabetología',
  'Nutrición clínica',

  // Aparato digestivo
  'Gastroenterología',
  'Hepatología',
  'Coloproctología',

  // Respiratorio
  'Neumología',
  'Otorrinolaringología',

  // Sistema nervioso
  'Neurología',
  'Neurocirugía',
  'Psiquiatría',
  'Psicología',
  'Neuropsicología',

  // Sistema renal / urinario
  'Nefrología',
  'Urología',

  // Oncología y hematología
  'Oncología clínica',
  'Hematología',
  'Radioterapia oncológica',

  // Sistema musculoesquelético
  'Traumatología y ortopedia',
  'Reumatología',
  'Fisiatría',

  // Sentidos
  'Oftalmología',

  // Cirugías
  'Cirugía general',
  'Cirugía plástica',
  'Cirugía vascular',
  'Cirugía pediátrica',
  'Cirugía maxilofacial',

  // Diagnóstico
  'Radiología',
  'Patología',
  'Medicina nuclear',

  // Otros
  'Anestesiología',
  'Geriatría',
  'Infectología',
  'Alergología e inmunología',
  'Medicina paliativa',
  'Genética médica',

  // Salud bucal y rehabilitación
  'Odontología general',
  'Ortodoncia',
  'Endodoncia',
  'Periodoncia',
  'Implantología dental',
  'Fisioterapia',
  'Kinesiología',
  'Fonoaudiología',
  'Terapia ocupacional',
  'Optometría',

  // Bienestar y salud mental complementaria
  'Nutricionista',
  'Coaching nutricional',
];

/**
 * Devuelve un set deduplicado y ordenado alfabéticamente combinando el
 * catálogo default con cualquier lista extra (típicamente especialidades
 * que la clínica ya tiene en su roster).
 */
export function mergeSpecialties(extra: string[] = []): string[] {
  const set = new Set<string>();
  for (const s of DEFAULT_SPECIALTIES) set.add(s);
  for (const s of extra) {
    const trimmed = s.trim();
    if (trimmed) set.add(trimmed);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}
