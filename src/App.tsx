import { useReducer, useEffect, useRef, useCallback } from "react";
import type {
  AppState,
  Phase,
  VisibleStep,
  Theme,
  Locale,
  CurrentPlan,
  PlanSnapshot,
  Outcome,
  CopyRow,
  FailedRow,
} from "./types.ts";
import {
  loadThemePreference,
  loadLocalePreference,
  saveThemePreference,
  saveLocalePreference,
  clearLocalePreference,
  useSystemTheme,
} from "./prefs.ts";
import { systemLocale } from "./i18n.ts";
import { invokeCommand, errorCode } from "./tauri.ts";
import { getText, getPluralText, getErrorLabel } from "./i18n.ts";

// ---------------------------------------------------------------------------
// State & reducer
// ---------------------------------------------------------------------------

type Action =
  | { type: "SET_PHASE"; phase: Phase; statusKey: string; statusVars?: Record<string, unknown>; isAlert?: boolean }
  | { type: "SET_VISIBLE_STEP"; step: VisibleStep }
  | { type: "SET_LOCALE"; locale: Locale; preference: Locale | null }
  | { type: "SET_THEME_PREFERENCE"; preference: Theme }
  | { type: "SET_SYSTEM_THEME"; isDark: boolean }
  | { type: "RENDER_SNAPSHOT"; snapshot: PlanSnapshot }
  | { type: "RENDER_OUTCOME"; outcome: Outcome }
  | { type: "CLEAR_PLAN" }
  | { type: "SET_EXECUTING_PLAN_ID"; id: string | null }
  | { type: "SET_SELECTED_DIR"; label: string }
  | { type: "SET_EMPTY_STATE"; titleKey: string; bodyKey: string }
  | { type: "SET_REQUEST_GEN"; gen: number };

function buildInitialState(): AppState {
  const localePreference = loadLocalePreference();
  const locale: Locale = localePreference ?? systemLocale();
  const themePreference = loadThemePreference();
  let initialSystemTheme: "light" | "dark" = "light";
  try {
    if (typeof window.matchMedia === "function") {
      initialSystemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
  } catch {
    initialSystemTheme = "light";
  }
  return {
    phase: "idle",
    visibleStep: "choose-folder",
    requestGeneration: 0,
    selectedDirectoryLabel: "",
    currentPlan: null,
    currentSnapshot: null,
    currentOutcome: null,
    executingPlanId: null,
    locale,
    localePreference,
    themePreference,
    systemTheme: initialSystemTheme,
    status: { key: "statusWaiting", vars: {}, isAlert: false },
    emptyState: { titleKey: "emptyReadyTitle", bodyKey: "emptyReadyBody" },
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_PHASE":
      return {
        ...state,
        phase: action.phase,
        status: {
          key: action.statusKey,
          vars: action.statusVars ?? {},
          isAlert: action.isAlert ?? false,
        },
      };
    case "SET_VISIBLE_STEP":
      return { ...state, visibleStep: action.step };
    case "SET_LOCALE":
      return { ...state, locale: action.locale, localePreference: action.preference };
    case "SET_THEME_PREFERENCE":
      return { ...state, themePreference: action.preference };
    case "SET_SYSTEM_THEME":
      return { ...state, systemTheme: action.isDark ? "dark" : "light" };
    case "RENDER_SNAPSHOT": {
      const { snapshot } = action;
      const copies = Array.isArray(snapshot.copies) ? snapshot.copies : [];
      const skips = Array.isArray(snapshot.skips) ? snapshot.skips : [];
      const canExecute = Boolean(snapshot.canExecute) && copies.length > 0;
      const plan: CurrentPlan = { planId: String(snapshot.planId ?? ""), canExecute };
      const newSnapshot: PlanSnapshot = {
        planId: plan.planId,
        directoryLabel: String(snapshot.directoryLabel ?? "Selected folder"),
        canExecute,
        copies,
        skips,
      };
      const phase: Phase = canExecute ? "plan-ready" : "plan-empty";
      const statusKey = canExecute ? "statusPlanReady" : "statusNoFilesToCopy";
      const statusVars = canExecute ? { count: copies.length } : {};
      return {
        ...state,
        currentPlan: plan,
        currentSnapshot: newSnapshot,
        currentOutcome: null,
        selectedDirectoryLabel: newSnapshot.directoryLabel,
        visibleStep: "review-plan",
        phase,
        status: { key: statusKey, vars: statusVars, isAlert: false },
        emptyState: canExecute
          ? state.emptyState
          : { titleKey: "emptyNoFilesTitle", bodyKey: "emptyNoFilesBody" },
      };
    }
    case "RENDER_OUTCOME": {
      const { outcome } = action;
      const hasFailure = outcome.failed.length > 0 || outcome.pending.length > 0;
      const phase: Phase = hasFailure ? "partial-failure" : "completed";
      const statusKey = hasFailure ? "statusPartialFailure" : "statusCompleted";
      return {
        ...state,
        currentPlan: null,
        currentSnapshot: null,
        currentOutcome: outcome,
        executingPlanId: null,
        visibleStep: "confirm-copy",
        phase,
        status: {
          key: statusKey,
          vars: { count: outcome.completed.length },
          isAlert: hasFailure,
        },
      };
    }
    case "CLEAR_PLAN":
      return {
        ...state,
        currentPlan: null,
        currentSnapshot: null,
        currentOutcome: null,
        visibleStep: "choose-folder",
        phase: "idle",
        status: { key: "statusDeclined", vars: {}, isAlert: false },
        emptyState: { titleKey: "emptyReadyTitle", bodyKey: "emptyReadyBody" },
      };
    case "SET_EXECUTING_PLAN_ID":
      return { ...state, executingPlanId: action.id };
    case "SET_SELECTED_DIR":
      return { ...state, selectedDirectoryLabel: action.label };
    case "SET_EMPTY_STATE":
      return {
        ...state,
        emptyState: { titleKey: action.titleKey, bodyKey: action.bodyKey },
      };
    case "SET_REQUEST_GEN":
      return { ...state, requestGeneration: action.gen };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook: resolved theme
// ---------------------------------------------------------------------------

function resolvedTheme(themePreference: Theme, systemTheme: "light" | "dark"): "light" | "dark" {
  if (themePreference === "light" || themePreference === "dark") return themePreference;
  return systemTheme;
}

// ---------------------------------------------------------------------------
// Hook: apply theme / lang to document root
// ---------------------------------------------------------------------------

function useDocumentTheme(theme: "light" | "dark", themePreference: Theme, locale: Locale) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themePreference = themePreference;
    document.documentElement.style.colorScheme = theme;
  }, [theme, themePreference]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = getText(locale, "metaTitle");
    const meta = document.querySelector<HTMLMetaElement>("meta[name='description']");
    if (meta) meta.content = getText(locale, "metaDescription");
  }, [locale]);
}

// ---------------------------------------------------------------------------
// Helper: phase → data-phase for CSS
// ---------------------------------------------------------------------------

function cssPhase(visibleStep: VisibleStep, phase: Phase): Phase {
  if (visibleStep === "review-plan") return "plan-ready";
  if (visibleStep === "confirm-copy") {
    if (
      phase === "executing" ||
      phase === "completed" ||
      phase === "partial-failure" ||
      phase === "execution-failure"
    )
      return phase;
    return "confirming";
  }
  const naturalStep: VisibleStep =
    phase === "plan-ready" || phase === "plan-empty"
      ? "review-plan"
      : phase === "confirming" || phase === "executing" || phase === "completed" ||
        phase === "partial-failure" || phase === "execution-failure"
      ? "confirm-copy"
      : "choose-folder";
  return naturalStep === "choose-folder" ? phase : "idle";
}

// ---------------------------------------------------------------------------
// Status text helper
// ---------------------------------------------------------------------------

function statusText(locale: Locale, key: string, vars: Record<string, unknown>): string {
  if (key === "statusPlanReady") return getPluralText(locale, "statusPlanReady", Number(vars.count ?? 0));
  if (key === "statusPartialFailure")
    return `${getPluralText(locale, "copiedFiles", Number(vars.count ?? 0))}; ${getText(locale, "statusPartialFailureTail")}`;
  if (key === "statusCompleted")
    return `${getPluralText(locale, "copiedFiles", Number(vars.count ?? 0))}. ${getText(locale, "statusCompletedTail")}`;
  if (key === "error") {
    return getErrorLabel(locale, String(vars.code ?? ""));
  }
  return getText(locale, key);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

import { AppShell } from "./components/AppShell.tsx";

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const genRef = useRef(state.requestGeneration);
  genRef.current = state.requestGeneration;

  const onSystemThemeChange = useCallback((isDark: boolean) => {
    dispatch({ type: "SET_SYSTEM_THEME", isDark });
  }, []);
  const systemTheme = useSystemTheme(onSystemThemeChange);

  useEffect(() => {
    dispatch({ type: "SET_SYSTEM_THEME", isDark: systemTheme === "dark" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const theme = resolvedTheme(state.themePreference, state.systemTheme);
  useDocumentTheme(theme, state.themePreference, state.locale);

  // language change
  useEffect(() => {
    const handler = () => {
      if (!state.localePreference) {
        dispatch({ type: "SET_LOCALE", locale: systemLocale(), preference: null });
      }
    };
    window.addEventListener("languagechange", handler);
    return () => window.removeEventListener("languagechange", handler);
  }, [state.localePreference]);

  // ---- actions ----

  const nextGen = useCallback(() => {
    const g = genRef.current + 1;
    genRef.current = g;
    dispatch({ type: "SET_REQUEST_GEN", gen: g });
    return g;
  }, []);

  const setThemePreference = useCallback((t: Theme) => {
    saveThemePreference(t);
    dispatch({ type: "SET_THEME_PREFERENCE", preference: t });
  }, []);

  const setLocale = useCallback((locale: Locale) => {
    saveLocalePreference(locale);
    dispatch({ type: "SET_LOCALE", locale, preference: locale });
  }, []);

  const clearLocale = useCallback(() => {
    clearLocalePreference();
    dispatch({ type: "SET_LOCALE", locale: systemLocale(), preference: null });
  }, []);

  const setVisibleStep = useCallback((step: VisibleStep) => {
    dispatch({ type: "SET_VISIBLE_STEP", step });
  }, []);

  const beginConfirmation = useCallback(() => {
    if (!state.currentPlan?.canExecute) return;
    dispatch({
      type: "SET_PHASE",
      phase: "confirming",
      statusKey: "statusConfirming",
    });
    dispatch({ type: "SET_VISIBLE_STEP", step: "confirm-copy" });
  }, [state.currentPlan]);

  const beginPlanning = useCallback(
    async (command: "select_and_plan" | "rescan") => {
      const gen = nextGen();
      const selecting = command === "select_and_plan";
      const previousStep = state.visibleStep;

      dispatch({
        type: "SET_PHASE",
        phase: selecting ? "selecting" : "scanning",
        statusKey: selecting ? "statusOpeningFolder" : "statusScanning",
      });
      dispatch({
        type: "SET_EMPTY_STATE",
        titleKey: selecting ? "emptyOpeningFolderTitle" : "emptyScanningTitle",
        bodyKey: "emptyPlanningBody",
      });
      dispatch({ type: "SET_VISIBLE_STEP", step: "choose-folder" });

      if (selecting) {
        await new Promise((r) => requestAnimationFrame(r));
        if (genRef.current !== gen) return;
        dispatch({ type: "SET_PHASE", phase: "scanning", statusKey: "statusScanning" });
      }

      try {
        const snapshot = await invokeCommand<PlanSnapshot | null>(command);
        if (genRef.current !== gen) return;

        if (selecting && snapshot === null) {
          // cancelled
          if (state.currentPlan?.planId) {
            dispatch({ type: "SET_VISIBLE_STEP", step: previousStep });
            dispatch({
              type: "SET_PHASE",
              phase: state.currentPlan.canExecute ? "plan-ready" : "plan-empty",
              statusKey: state.currentPlan.canExecute
                ? "statusSelectionCanceledPreviousPlan"
                : "statusSelectionCanceledNoFiles",
            });
          } else {
            dispatch({ type: "SET_VISIBLE_STEP", step: "choose-folder" });
            dispatch({
              type: "SET_PHASE",
              phase: "idle",
              statusKey: "statusSelectionCanceled",
            });
            dispatch({
              type: "SET_EMPTY_STATE",
              titleKey: "emptyReadyTitle",
              bodyKey: "emptyReadyBody",
            });
          }
          return;
        }

        dispatch({ type: "RENDER_SNAPSHOT", snapshot: snapshot! });
      } catch (error) {
        if (genRef.current !== gen) return;
        dispatch({
          type: "SET_PHASE",
          phase: "planning-failure",
          statusKey: "error",
          statusVars: { code: errorCode(error) },
          isAlert: true,
        });
        dispatch({
          type: "SET_EMPTY_STATE",
          titleKey: "emptyPlanningFailedTitle",
          bodyKey: "emptyPlanningFailedBody",
        });
        dispatch({ type: "SET_VISIBLE_STEP", step: "choose-folder" });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.visibleStep, state.currentPlan],
  );

  const discardCurrentPlan = useCallback(async () => {
    const planId = state.currentPlan?.planId;
    if (!planId) {
      dispatch({ type: "CLEAR_PLAN" });
      dispatch({
        type: "SET_EMPTY_STATE",
        titleKey: "emptyReadyTitle",
        bodyKey: "emptyReadyBody",
      });
      dispatch({ type: "SET_PHASE", phase: "idle", statusKey: "statusWaiting" });
      return;
    }
    const gen = nextGen();
    dispatch({ type: "SET_PHASE", phase: "executing", statusKey: "statusDiscarding" });
    try {
      await invokeCommand("discard_plan", { planId });
    } catch (error) {
      if (genRef.current !== gen) return;
      dispatch({
        type: "SET_PHASE",
        phase: "declined",
        statusKey: "error",
        statusVars: { code: errorCode(error) },
        isAlert: true,
      });
      dispatch({
        type: "SET_EMPTY_STATE",
        titleKey: "emptyDiscardedLocalTitle",
        bodyKey: "emptyDiscardedLocalBody",
      });
      dispatch({ type: "SET_VISIBLE_STEP", step: "choose-folder" });
      dispatch({
        type: "RENDER_OUTCOME",
        outcome: { completed: [], failed: [], pending: [] },
      });
      return;
    }
    if (genRef.current !== gen) return;
    dispatch({ type: "CLEAR_PLAN" });
    dispatch({
      type: "SET_PHASE",
      phase: "idle",
      statusKey: "statusDeclined",
    });
    dispatch({
      type: "SET_EMPTY_STATE",
      titleKey: "emptyReadyTitle",
      bodyKey: "emptyReadyBody",
    });
  }, [state.currentPlan, nextGen]);

  const executeCurrentPlan = useCallback(async () => {
    const planId = state.currentPlan?.planId;
    if (!planId || state.phase === "executing" || state.executingPlanId === planId) return;

    dispatch({ type: "SET_EXECUTING_PLAN_ID", id: planId });
    const gen = nextGen();
    dispatch({ type: "SET_PHASE", phase: "executing", statusKey: "statusCopying" });
    dispatch({ type: "SET_VISIBLE_STEP", step: "confirm-copy" });

    try {
      const raw = await invokeCommand<{
        completed?: CopyRow[];
        failed?: FailedRow | FailedRow[];
        pending?: CopyRow[];
      }>("execute_plan", { planId });
      if (genRef.current !== gen) return;
      dispatch({ type: "SET_EXECUTING_PLAN_ID", id: null });

      const completed = Array.isArray(raw?.completed) ? raw.completed : [];
      const failed = Array.isArray(raw?.failed)
        ? raw.failed
        : raw?.failed
        ? [raw.failed as FailedRow]
        : [];
      const pending = Array.isArray(raw?.pending) ? raw.pending : [];
      dispatch({ type: "RENDER_OUTCOME", outcome: { completed, failed, pending } });
    } catch (error) {
      if (genRef.current !== gen) return;
      dispatch({ type: "SET_EXECUTING_PLAN_ID", id: null });
      dispatch({
        type: "SET_PHASE",
        phase: "execution-failure",
        statusKey: "error",
        statusVars: { code: errorCode(error) },
        isAlert: true,
      });
      dispatch({
        type: "SET_EMPTY_STATE",
        titleKey: "emptyCopyDidNotRunTitle",
        bodyKey: "emptyCopyDidNotRunBody",
      });
      dispatch({ type: "SET_VISIBLE_STEP", step: "confirm-copy" });
    }
  }, [state.currentPlan, state.phase, state.executingPlanId, nextGen]);

  const t = useCallback((key: string) => getText(state.locale, key), [state.locale]);
  const tp = useCallback(
    (key: string, count: number) => getPluralText(state.locale, key, count),
    [state.locale],
  );

  const statusMsg = statusText(state.locale, state.status.key, state.status.vars);

  return (
    <AppShell
      state={state}
      cssPhaseValue={cssPhase(state.visibleStep, state.phase)}
      statusMsg={statusMsg}
      t={t}
      tp={tp}
      onSelectFolder={() => void beginPlanning("select_and_plan")}
      onRescan={() => void beginPlanning("rescan")}
      onReviewPlan={() => setVisibleStep("review-plan")}
      onBack={() => {
        if (state.phase === "executing") return;
        setVisibleStep(state.visibleStep === "confirm-copy" ? "review-plan" : "choose-folder");
      }}
      onStartOver={() => void discardCurrentPlan()}
      onContinue={() => {
        if (state.visibleStep === "confirm-copy") {
          void executeCurrentPlan();
        } else {
          beginConfirmation();
        }
      }}
      onConfirmCopy={() => void executeCurrentPlan()}
      onCancelCopy={() => void discardCurrentPlan()}
      onSetTheme={setThemePreference}
      onSetLocale={setLocale}
      onClearLocale={clearLocale}
    />
  );
}
