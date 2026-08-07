// Phase identifiers — match the data-phase CSS selectors in styles.css
export type Phase =
  | "idle"
  | "selecting"
  | "scanning"
  | "plan-ready"
  | "plan-empty"
  | "confirming"
  | "executing"
  | "completed"
  | "declined"
  | "planning-failure"
  | "partial-failure"
  | "execution-failure";

export type VisibleStep = "choose-folder" | "review-plan" | "confirm-copy";

export type Theme = "system" | "light" | "dark";
export type Locale = "en" | "pt-BR";

export interface CopyRow {
  sourceLabel?: string;
  targetLabel?: string;
}

export interface SkipRow {
  sourceLabel?: string;
  label?: string;
  reasonCode?: string;
  reason?: string;
}

export interface FailedRow extends CopyRow {
  code?: string;
  errorCode?: string;
  kind?: string;
  partialTargetMayRemain?: boolean;
}

export interface PlanSnapshot {
  planId: string;
  directoryLabel: string;
  canExecute: boolean;
  copies: CopyRow[];
  skips: SkipRow[];
}

export interface CurrentPlan {
  planId: string;
  canExecute: boolean;
}

export interface Outcome {
  completed: CopyRow[];
  failed: FailedRow[];
  pending: CopyRow[];
}

export interface StatusState {
  key: string;
  vars: Record<string, unknown>;
  isAlert: boolean;
}

export interface EmptyStateContent {
  titleKey: string;
  bodyKey: string;
}

export interface AppState {
  phase: Phase;
  visibleStep: VisibleStep;
  requestGeneration: number;
  selectedDirectoryLabel: string;
  currentPlan: CurrentPlan | null;
  currentSnapshot: PlanSnapshot | null;
  currentOutcome: Outcome | null;
  executingPlanId: string | null;
  locale: Locale;
  localePreference: Locale | null;
  themePreference: Theme;
  systemTheme: "light" | "dark";
  status: StatusState;
  emptyState: EmptyStateContent;
}
