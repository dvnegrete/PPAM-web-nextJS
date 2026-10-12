export interface Location {
  id: string;
  name: string;
  timezone: string;
  defaultCapacity: number;
  minCapacity: number;
  maxCapacity: number;
}

export interface CalendarShift {
  id: string;
  date: string;
  range: string;
  status: 'PLANNED' | 'OPEN' | 'FULL' | 'CANCELLED';
  capacity: number;
  occupied: number;
  weekOfMonth: number;
  participants: Array<{ id: string; name: string; origin: string; confirmed: boolean }>;
}

export type MaritalStatus =
  | 'SIN_REGISTRAR'
  | 'SOLTERO'
  | 'CASADO'
  | 'VIUDO'
  | 'SEPARADO'
  | 'DIVORCIADO';

/** El rol es del vínculo con el punto, no de la persona. */
export type ParticipantRole = 'PARTICIPANT' | 'SUPERVISOR' | 'ADMIN';

/** El estado sí es de la persona: una baja lo es en todos los puntos. */
export type ParticipantStatus = 'ACTIVE' | 'PAUSED' | 'INACTIVE';

export const ROLE_LABELS: Record<ParticipantRole, string> = {
  PARTICIPANT: 'Participante',
  SUPERVISOR: 'Encargado',
  ADMIN: 'Administrador',
};

/** Qué significa cada estado, en los términos del grupo. */
export const STATUS_LABELS: Record<ParticipantStatus, string> = {
  ACTIVE: 'Activo',
  PAUSED: 'Pausado',
  INACTIVE: 'Dado de baja',
};

/** Lo que el rol recibe en el cuerpo del PATCH, que el servidor traduce. */
export const ROLE_VALUES: Record<ParticipantRole, string> = {
  PARTICIPANT: 'participante',
  SUPERVISOR: 'encargado',
  ADMIN: 'admin',
};

export interface Participant {
  id: string;
  firstName: string;
  paternalSurname: string;
  maternalSurname: string | null;
  displayName: string | null;
  phoneE164: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  coverageAlerts: boolean;
  optInAt: string | null;
  maritalStatus: MaritalStatus;
  congregation: string | null;
  circuit: string | null;
  city: string | null;
  /** Cónyuge que también participa en los exhibidores. */
  spouse: {
    id: string;
    firstName: string;
    paternalSurname: string;
    maternalSurname: string | null;
    displayName: string | null;
  } | null;
  /** Nombre del cónyuge cuando no participa. */
  spouseName: string | null;
}

export interface SpouseCandidate {
  id: string;
  firstName: string;
  paternalSurname: string;
  maternalSurname: string | null;
  displayName: string | null;
}

export const MARITAL_LABELS: Record<MaritalStatus, string> = {
  SIN_REGISTRAR: 'Sin registrar',
  SOLTERO: 'Soltero',
  CASADO: 'Casado',
  VIUDO: 'Viudo',
  SEPARADO: 'Separado',
  DIVORCIADO: 'Divorciado',
};

/** Congregación, circuito y ciudad: para reportes y filtros. */
export type OrganizationField = 'congregation' | 'circuit' | 'city';

export const ORGANIZATION_LABELS: Record<OrganizationField, string> = {
  congregation: 'Congregación',
  circuit: 'Circuito',
  city: 'Ciudad',
};

/** Valores ya registrados en cada campo, para sugerir y para armar los filtros. */
export type OrganizationValues = Record<OrganizationField, string[]>;

export interface ImportResult {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
  errors: Array<{
    row: number;
    message: string;
    /** Quién es esa fila: «Ana López · 55 1234 5678». */
    label?: string;
  }>;
}

export interface MonthlySummary {
  year: number;
  month: number;
  locationName: string;
  totalShifts: number;
  cancelledShifts: number;
  fullyStaffedShifts: number;
  understaffedShifts: number;
  totalAssignments: number;
  cancellations: number;
  coverages: number;
  coverageRequests: number;
  coverageRequestsFulfilled: number;
  coverageRequestsExpired: number;
}

export interface AttendanceRow {
  participantId: string;
  /** Nombre ya compuesto por el servidor en formato de padrón: «López Pérez, Ana». */
  fullName: string;
  served: number;
  cancelled: number;
  covered: number;
  upcoming: number;
}

export interface LocationSettings {
  messagingMode: 'test' | 'live';
  allowedRecipients: string[];
  broadcastCoverageToParticipants: boolean;
  urgentWindowHours: number;
  supervisorTimeoutMinutes: number;
  urgentSupervisorTimeoutMinutes: number;
  coverageCloseHoursBeforeShift: number;
  reminderHourLocal: number;
  weekdayReminderDaysAhead: number;
  weekendReminderDaysAhead: number;
  scheduleHorizonMonths: number;
  broadcastBatchSize: number;
  autoResolveUrgent: boolean;
}

export interface AuditEntry {
  id: string;
  actorType: string;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Tablero operativo
// ---------------------------------------------------------------------------

/** Nivel de necesidad de un turno; define su color en el tablero. */
export type NeedLevel = 'ok' | 'bajoCupo' | 'bajoMinimo' | 'cancelado';

export interface DashboardParticipant {
  assignmentId: string;
  participantId: string;
  name: string;
  /** Cónyuge que también participa; sirve para emparejarlos dentro del turno. */
  spouseId: string | null;
  origin: 'FIXED' | 'SIGNUP' | 'COVERAGE' | 'MANUAL';
  confirmed: boolean;
  assignedAt: string | null;
  assignedByName: string | null;
}

export interface DashboardCancellation {
  participantId: string;
  name: string;
  cancelledAt: string | null;
  reason: string | null;
  reasonCode: string | null;
  cancelledByName: string | null;
}

export interface DashboardShift {
  id: string;
  date: string;
  range: string;
  startsAt: string;
  status: 'PLANNED' | 'OPEN' | 'FULL' | 'CANCELLED';
  capacity: number;
  occupied: number;
  /** Lugares que faltan para la meta del turno; es lo que se convoca. */
  freeSlots: number;
  /**
   * Lugares extra que admite por encima de la meta, hasta el tope del punto.
   * No es una carencia: no se convoca para llenarlos ni cambian el color.
   */
  extraSlots: number;
  need: NeedLevel;
  participants: DashboardParticipant[];
  cancellations: DashboardCancellation[];
}

export interface DashboardDay {
  date: string;
  weekday: number;
  label: string;
  shifts: DashboardShift[];
}

export interface Dashboard {
  from: string;
  to: string;
  timezone: string;
  capacity: number;
  minCapacity: number;
  summary: {
    totalShifts: number;
    understaffed: number;
    critical: number;
    cancellations: number;
  };
  days: DashboardDay[];
}

export interface Movement {
  id: string;
  action: string;
  description: string;
  participantName: string | null;
  shiftLabel: string | null;
  reason: string | null;
  reasonCode: string | null;
  by: string;
  at: string;
}

export interface AvailableParticipant {
  id: string;
  firstName: string;
  paternalSurname: string;
  maternalSurname: string | null;
  displayName: string | null;
  role: string;
}

// ---------------------------------------------------------------------------
// Encuesta
// ---------------------------------------------------------------------------

export interface PollOption {
  shiftId: string;
  text: string;
  date: string;
  missing: number;
}

export interface PollDraft {
  question: string;
  options: PollOption[];
  plainText: string;
  totalNeeded: number;
  truncated: boolean;
  maxOptions: number;
}

/** Motivos frecuentes de cancelación, alineados con el backend. */
export const CANCEL_REASONS: Array<{ code: string; label: string }> = [
  { code: 'enfermedad', label: 'Enfermedad' },
  { code: 'trabajo', label: 'Trabajo' },
  { code: 'viaje', label: 'Viaje' },
  { code: 'otro', label: 'Otro' },
];

// ---------------------------------------------------------------------------
// Turnos fijos (quién atiende habitualmente cada franja)
// ---------------------------------------------------------------------------

export interface RecurringHolder {
  recurringId: string;
  participantId: string;
  name: string;
}

export interface RecurringSlot {
  templateId: string;
  /** 0 = domingo, 1 = lunes, … 6 = sábado. */
  weekday: number;
  /** 0 = todas las semanas; 1 a 5 = ordinal del mes. */
  weekOfMonth: number;
  startMinute: number;
  endMinute: number;
  range: string;
  capacity: number;
  holders: RecurringHolder[];
  freeSlots: number;
}

export interface RecurringPadronRow {
  id: string;
  name: string;
  formalName: string;
  /** Cuántos turnos fijos tiene: 0 es lo que falta por capturar. */
  recurringCount: number;
}

export interface RecurringOverview {
  slots: RecurringSlot[];
  padron: RecurringPadronRow[];
}

export interface RecurringCandidate {
  id: string;
  name: string;
  formalName: string;
}

/** Respuesta de la edición: la fila actualizada más lo que hay que contar. */
export interface UpdateParticipantResult extends Participant {
  /** Turnos futuros que se liberaron al pausar o dar de baja. */
  cancelledShifts: number;
  /** Avisos que no impidieron guardar pero el administrador debe leer. */
  warnings: string[];
}
