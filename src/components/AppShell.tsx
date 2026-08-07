import type { Phase, AppState, Theme, Locale } from "../types.ts";
import appIconSrc from "../app-icon.svg";
import { ProgressTracker } from "./ProgressTracker.tsx";
import { SettingsMenu } from "./SettingsMenu.tsx";
import { ChooseStep } from "./ChooseStep.tsx";
import { ReviewStep } from "./ReviewStep.tsx";
import { ConfirmStep } from "./ConfirmStep.tsx";

interface Props {
  state: AppState;
  cssPhaseValue: Phase;
  statusMsg: string;
  t: (key: string) => string;
  tp: (key: string, count: number) => string;
  onSelectFolder: () => void;
  onRescan: () => void;
  onReviewPlan: () => void;
  onBack: () => void;
  onStartOver: () => void;
  onContinue: () => void;
  onConfirmCopy: () => void;
  onCancelCopy: () => void;
  onSetTheme: (theme: Theme) => void;
  onSetLocale: (locale: Locale) => void;
  onClearLocale: () => void;
}

export function AppShell({
  state,
  cssPhaseValue,
  statusMsg,
  t,
  tp,
  onSelectFolder,
  onRescan,
  onReviewPlan,
  onBack,
  onStartOver,
  onContinue,
  onConfirmCopy,
  onCancelCopy,
  onSetTheme,
  onSetLocale,
}: Props) {
  const { phase, visibleStep, currentPlan, currentSnapshot, currentOutcome } = state;
  const busy = phase === "selecting" || phase === "scanning" || phase === "executing";
  const hasPlan = Boolean(currentPlan?.planId);
  const canExecute = Boolean(currentPlan?.planId && currentPlan.canExecute);
  const hasOutcome = Boolean(currentOutcome);

  const copies = currentSnapshot?.copies ?? [];
  const skips = currentSnapshot?.skips ?? [];

  // Button disabled states
  const buttons = {
    select: busy,
    rescan: busy || !state.selectedDirectoryLabel,
    review: busy || !hasPlan || visibleStep === "review-plan",
    back: busy || visibleStep === "choose-folder" || hasOutcome,
    startOver: busy || (!hasPlan && !hasOutcome),
    copy:
      busy ||
      hasOutcome ||
      (visibleStep !== "review-plan" && visibleStep !== "confirm-copy") ||
      !canExecute,
    confirm: busy || visibleStep !== "confirm-copy" || hasOutcome || !canExecute,
    cancel: busy || (!hasPlan && !hasOutcome),
  };

  // Action bar visibility
  const showActionBar =
    visibleStep === "review-plan" ||
    visibleStep === "confirm-copy" ||
    (visibleStep === "choose-folder" && hasPlan);

  // Copy button label
  let copyBtnLabel: string;
  if (visibleStep === "review-plan") {
    copyBtnLabel = t("continue");
  } else if (visibleStep === "confirm-copy" && canExecute) {
    copyBtnLabel = tp("copyButtonSubtitles", copies.length);
  } else {
    copyBtnLabel = t("copySubtitles");
  }

  // Confirm-step layout tweaks via data attributes handled by CSS
  const confirmStepActive = visibleStep === "confirm-copy";

  return (
    <div
      className="shell"
      data-phase={cssPhaseValue}
      data-visible-step={visibleStep}
      data-has-plan={String(hasPlan)}
      aria-busy={busy ? "true" : "false"}
    >
      {/* Header */}
      <header className="shell__header" role="banner">
        <div className="shell__brand">
          <img className="shell__icon" src={appIconSrc} width={24} height={24} alt="" />
          <div className="shell__title-group">
            <p className="eyebrow">{t("localCopyPlanner")}</p>
            <h1>{t("appTitle")}</h1>
          </div>
        </div>
        <p className="lede">{t("lede")}</p>
        <SettingsMenu
          t={t}
          locale={state.locale}
          themePreference={state.themePreference}
          onSetTheme={onSetTheme}
          onSetLocale={onSetLocale}
        />
      </header>

      {/* Progress tracker */}
      <ProgressTracker visibleStep={visibleStep} t={t} />

      {/* Main content */}
      <main className="shell__main" id="main-content">
        {/* Status (aria-live) */}
        <section
          className="status-line"
          aria-label={t("statusRegionLabel")}
        >
          <strong>{t("statusLabel")}</strong>
          <p
            id="status-message"
            aria-live={state.status.isAlert ? "assertive" : "polite"}
            role={state.status.isAlert ? "alert" : undefined}
          >
            {statusMsg}
          </p>
        </section>

        {/* Choose folder step */}
        <ChooseStep
          t={t}
          phase={phase}
          visibleStep={visibleStep}
          selectedDirectoryLabel={state.selectedDirectoryLabel}
          emptyState={state.emptyState}
          onSelectFolder={onSelectFolder}
          selectDisabled={buttons.select}
        />

        {/* Review plan step */}
        <ReviewStep
          t={t}
          visibleStep={visibleStep}
          copies={copies}
          skips={skips}
          locale={state.locale}
          directoryLabel={currentSnapshot?.directoryLabel ?? ""}
        />

        {/* Confirm / outcomes step */}
        <ConfirmStep
          t={t}
          tp={tp}
          visibleStep={visibleStep}
          phase={phase}
          copies={copies}
          outcome={currentOutcome}
          canExecute={canExecute}
          confirmDisabled={buttons.confirm}
          cancelDisabled={buttons.cancel}
          onConfirmCopy={onConfirmCopy}
          onCancelCopy={onCancelCopy}
          locale={state.locale}
        />
      </main>

      {/* Action bar footer */}
      {showActionBar && (
        <footer className="action-bar" aria-label={t("actionsLabel")}>
          <button
            className="button button--secondary"
            type="button"
            onClick={onRescan}
            disabled={buttons.rescan}
          >
            {t("rescan")}
          </button>
          {visibleStep === "choose-folder" && hasPlan && (
            <button
              className="button button--secondary"
              type="button"
              onClick={onReviewPlan}
              disabled={buttons.review}
            >
              {t("reviewCurrentPlan")}
            </button>
          )}
          {(visibleStep === "review-plan" || (confirmStepActive && !hasOutcome)) && (
            <button
              className="button button--secondary"
              type="button"
              onClick={onBack}
              disabled={buttons.back}
              data-action="back"
            >
              {t("back")}
            </button>
          )}
          <button
            className="button button--secondary"
            type="button"
            onClick={onStartOver}
            disabled={buttons.startOver}
          >
            {t("startOver")}
          </button>
          <button
            className="button button--primary"
            type="button"
            onClick={onContinue}
            disabled={buttons.copy}
          >
            {copyBtnLabel}
          </button>
        </footer>
      )}
    </div>
  );
}
