import type { AppState, Phase, Theme, Locale } from '../types.ts';
import { TitleBar } from './TitleBar.tsx';
import { ProgressTracker } from './ProgressTracker.tsx';
import { SettingsMenu } from './SettingsMenu.tsx';
import { ChooseStep } from './ChooseStep.tsx';
import { ReviewStep } from './ReviewStep.tsx';
import { ConfirmStep } from './ConfirmStep.tsx';

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
  state, statusMsg, t, tp,
  onSelectFolder, onBack, onStartOver,
  onContinue, onConfirmCopy,
  onSetTheme, onSetLocale,
}: Props) {
  const { phase, visibleStep, currentPlan, currentSnapshot, currentOutcome } = state;
  const busy = phase === 'selecting' || phase === 'scanning' || phase === 'executing';
  const hasPlan = Boolean(currentPlan?.planId);
  const canExecute = Boolean(currentPlan?.planId && currentPlan.canExecute);
  const hasOutcome = Boolean(currentOutcome);
  const copies = currentSnapshot?.copies ?? [];
  const skips  = currentSnapshot?.skips  ?? [];

  const backDisabled      = busy || visibleStep === 'choose-folder' || hasOutcome;
  const startOverDisabled = busy || (!hasPlan && !hasOutcome);
  const confirmDisabled   = busy || visibleStep !== 'confirm-copy' || hasOutcome || !canExecute;
  const continueDisabled  = busy || !canExecute;

  return (
    <div
      className="flex min-h-dvh flex-col bg-background text-foreground"
      aria-busy={busy ? 'true' : 'false'}
    >
      <TitleBar
        title={t('appTitle')}
        rightSlot={
          <SettingsMenu
            t={t}
            locale={state.locale}
            themePreference={state.themePreference}
            onSetTheme={onSetTheme}
            onSetLocale={onSetLocale}
          />
        }
      />

      <ProgressTracker visibleStep={visibleStep} t={t} />

      <div
        className="sr-only"
        aria-live={state.status.isAlert ? 'assertive' : 'polite'}
        role={state.status.isAlert ? 'alert' : undefined}
      >
        {statusMsg}
      </div>

      <main className="flex-1 overflow-y-auto px-6" id="main-content">
        <ChooseStep
          t={t}
          phase={phase}
          visibleStep={visibleStep}
          selectedDirectoryLabel={state.selectedDirectoryLabel}
          emptyState={state.emptyState}
          onSelectFolder={onSelectFolder}
          selectDisabled={busy}
        />

        <ReviewStep
          t={t}
          visibleStep={visibleStep}
          copies={copies}
          skips={skips}
          locale={state.locale}
          directoryLabel={currentSnapshot?.directoryLabel ?? ''}
          onBack={onBack}
          onContinue={onContinue}
          continueDisabled={continueDisabled}
          backDisabled={backDisabled}
        />

        <ConfirmStep
          t={t}
          tp={tp}
          visibleStep={visibleStep}
          phase={phase}
          copies={copies}
          outcome={currentOutcome}
          canExecute={canExecute}
          onBack={onBack}
          onStartOver={onStartOver}
          onConfirmCopy={onConfirmCopy}
          backDisabled={backDisabled}
          startOverDisabled={startOverDisabled}
          confirmDisabled={confirmDisabled}
          locale={state.locale}
        />
      </main>
    </div>
  );
}
