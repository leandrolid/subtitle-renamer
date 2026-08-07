import { ChevronLeft, Copy, Captions, FolderInput, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button.tsx';
import { getErrorLabel } from '../i18n.ts';
import type { VisibleStep, Phase, CopyRow, Outcome, Locale } from '../types.ts';

interface Props {
  t: (key: string) => string;
  tp: (key: string, count: number) => string;
  visibleStep: VisibleStep;
  phase: Phase;
  copies: CopyRow[];
  outcome: Outcome | null;
  canExecute: boolean;
  onBack: () => void;
  onStartOver: () => void;
  onConfirmCopy: () => void;
  backDisabled: boolean;
  startOverDisabled: boolean;
  confirmDisabled: boolean;
  locale: Locale;
}

export function ConfirmStep({
  t, tp, visibleStep, phase, copies, outcome,
  canExecute, onBack, onStartOver, onConfirmCopy,
  backDisabled, startOverDisabled, confirmDisabled, locale,
}: Props) {
  if (visibleStep !== 'confirm-copy') return null;
  const showEmptyForFailure = phase === 'execution-failure';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-8">
      {showEmptyForFailure && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('noPlanLoaded')}</p>
          <h3 className="text-sm font-medium">{t('emptyCopyDidNotRunTitle')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t('emptyCopyDidNotRunBody')}</p>
        </div>
      )}

      {!showEmptyForFailure && !outcome && (
        <>
          <div className="space-y-2 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-muted text-brand">
              <Copy className="size-6" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">{t('copyPlannedSubtitles')}</h2>
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
              {tp('confirmCopyCount', copies.length)}
            </p>
          </div>

          <ul className="overflow-hidden rounded-xl border border-border bg-card">
            {copies.map((row, i) => (
              <li key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <Captions className="size-4 shrink-0 text-brand" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm">{row.targetLabel ?? t('unknownTarget')}</p>
                </div>
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  new
                </span>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <FolderInput className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t('copyNotMoveTitle')}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{t('copyNotMoveBody')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t('safeDefaultTitle')}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{t('safeDefaultBody')}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onBack} disabled={backDisabled} className="gap-1.5">
              <ChevronLeft className="size-4" />
              {t('back')}
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onStartOver} disabled={startOverDisabled}>
                {t('startOver')}
              </Button>
              {canExecute && (
                <Button variant="brand" onClick={onConfirmCopy} disabled={confirmDisabled} className="gap-1.5">
                  <Copy className="size-4" />
                  {tp('copyButtonSubtitles', copies.length)}
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {!showEmptyForFailure && outcome && (
        <OutcomeGroups t={t} outcome={outcome} locale={locale} onStartOver={onStartOver} startOverDisabled={startOverDisabled} />
      )}
    </div>
  );
}

function OutcomeGroups({ t, outcome, locale, onStartOver, startOverDisabled }: {
  t: (key: string) => string;
  outcome: Outcome;
  locale: Locale;
  onStartOver: () => void;
  startOverDisabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-4" aria-label={t('outcomesLabel')}>
      {outcome.completed.length > 0 && (
        <section aria-labelledby="completed-title">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('completed')}</p>
          <h3 id="completed-title" className="mb-2 text-sm font-medium">{t('copiedFiles')}</h3>
          <ul className="overflow-hidden rounded-xl border border-border bg-card">
            {outcome.completed.map((row, i) => (
              <li key={i} className="flex items-center gap-2 border-b border-border px-4 py-3 last:border-b-0">
                <Captions className="size-4 shrink-0 text-emerald-400" />
                <span className="min-w-0 font-mono text-sm">
                  <bdi>{row.sourceLabel ?? ''}</bdi>
                  <span className="mx-1 text-muted-foreground">→</span>
                  <bdi>{row.targetLabel ?? ''}</bdi>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {outcome.failed.length > 0 && (
        <section aria-labelledby="failed-title">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('failed')}</p>
          <h3 id="failed-title" className="mb-2 text-sm font-medium">{t('failedFile')}</h3>
          <ul className="overflow-hidden rounded-xl border border-border bg-card">
            {outcome.failed.map((row, i) => (
              <li key={i} className="flex flex-col gap-0.5 border-b border-border px-4 py-3 last:border-b-0">
                <span className="font-mono text-sm">
                  <bdi>{row.sourceLabel ?? ''}</bdi>
                  <span className="mx-1 text-muted-foreground">→</span>
                  <bdi>{row.targetLabel ?? ''}</bdi>
                </span>
                <span className="text-xs text-destructive">
                  {getErrorLabel(locale, String(row.code ?? row.errorCode ?? row.kind ?? ''))}
                  {row.partialTargetMayRemain ? ` ${t('partialTargetMayRemain')}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {outcome.pending.length > 0 && (
        <section aria-labelledby="pending-title">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('pending')}</p>
          <h3 id="pending-title" className="mb-2 text-sm font-medium">{t('pendingAfterFailure')}</h3>
          <ul className="overflow-hidden rounded-xl border border-border bg-card">
            {outcome.pending.map((row, i) => (
              <li key={i} className="flex items-center gap-2 border-b border-border px-4 py-3 last:border-b-0 font-mono text-sm">
                <bdi>{row.sourceLabel ?? ''}</bdi>
                <span className="mx-1 text-muted-foreground">→</span>
                <bdi>{row.targetLabel ?? ''}</bdi>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="outline" onClick={onStartOver} disabled={startOverDisabled}>
          {t('startOver')}
        </Button>
      </div>
    </div>
  );
}
