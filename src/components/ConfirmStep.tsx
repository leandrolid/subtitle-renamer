import type { VisibleStep, Phase, CopyRow, Outcome, Locale } from "../types.ts";
import { getErrorLabel } from "../i18n.ts";

interface Props {
  t: (key: string) => string;
  tp: (key: string, count: number) => string;
  visibleStep: VisibleStep;
  phase: Phase;
  copies: CopyRow[];
  outcome: Outcome | null;
  canExecute: boolean;
  confirmDisabled: boolean;
  cancelDisabled: boolean;
  onConfirmCopy: () => void;
  onCancelCopy: () => void;
  locale: Locale;
}

export function ConfirmStep({
  t,
  tp,
  visibleStep,
  phase,
  copies,
  outcome,
  canExecute,
  confirmDisabled,
  cancelDisabled,
  onConfirmCopy,
  onCancelCopy,
  locale,
}: Props) {
  const isVisible = visibleStep === "confirm-copy";
  const showEmptyForFailure = phase === "execution-failure";

  if (!isVisible) return null;

  return (
    <section
      className="workflow workflow--confirm"
      aria-label={t("confirmCopyLabel")}
      data-workflow-region="confirm-copy"
    >
      {showEmptyForFailure && (
        <section className="empty-state" aria-labelledby="empty-exec-title">
          <p className="eyebrow">{t("noPlanLoaded")}</p>
          <h2 id="empty-exec-title">{t("emptyCopyDidNotRunTitle")}</h2>
          <p>{t("emptyCopyDidNotRunBody")}</p>
        </section>
      )}

      {!showEmptyForFailure && !outcome && (
        <section className="confirmation" aria-labelledby="confirm-title">
          <div className="step-intro">
            <span className="confirm-icon" aria-hidden="true" />
            <p className="eyebrow">{t("confirm")}</p>
            <h2 id="confirm-title">{t("copyPlannedSubtitles")}</h2>
            <p>{tp("confirmCopyCount", copies.length)}</p>
            <p>{t("confirmBody")}</p>
          </div>

          <ol className="file-list">
            {copies.map((row, i) => (
              <li key={i}>
                <bdi>{row.targetLabel ?? t("unknownTarget")}</bdi>
              </li>
            ))}
          </ol>

          <div className="safety-cards">
            <article className="safety-card">
              <h3>{t("copyNotMoveTitle")}</h3>
              <p>{t("copyNotMoveBody")}</p>
            </article>
            <article className="safety-card">
              <h3>{t("safeDefaultTitle")}</h3>
              <p>{t("safeDefaultBody")}</p>
            </article>
          </div>

          {canExecute && (
            <div className="inline-actions">
              <button
                className="button button--primary"
                type="button"
                onClick={onConfirmCopy}
                disabled={confirmDisabled}
              >
                {t("yesCopy")}
              </button>
              <button
                className="button button--secondary"
                type="button"
                onClick={onCancelCopy}
                disabled={cancelDisabled}
              >
                {t("startOver")}
              </button>
            </div>
          )}
        </section>
      )}

      {!showEmptyForFailure && outcome && (
        <OutcomeGroups t={t} outcome={outcome} locale={locale} />
      )}
    </section>
  );
}

function OutcomeGroups({
  t,
  outcome,
  locale,
}: {
  t: (key: string) => string;
  outcome: Outcome;
  locale: Locale;
}) {
  return (
    <section className="outcomes" aria-label={t("outcomesLabel")}>
      {outcome.completed.length > 0 && (
        <section className="panel" aria-labelledby="completed-title">
          <p className="eyebrow">{t("completed")}</p>
          <h2 id="completed-title">{t("copiedFiles")}</h2>
          <ol className="file-list">
            {outcome.completed.map((row, i) => (
              <li key={i}>
                <bdi>{row.sourceLabel ?? ""}</bdi>
                <span> → </span>
                <bdi>{row.targetLabel ?? ""}</bdi>
              </li>
            ))}
          </ol>
        </section>
      )}

      {outcome.failed.length > 0 && (
        <section className="panel" aria-labelledby="failed-title">
          <p className="eyebrow">{t("failed")}</p>
          <h2 id="failed-title">{t("failedFile")}</h2>
          <ol className="file-list">
            {outcome.failed.map((row, i) => (
              <li key={i}>
                <bdi>{row.sourceLabel ?? ""}</bdi>
                <span> → </span>
                <bdi>{row.targetLabel ?? ""}</bdi>
                <p>
                  {getErrorLabel(locale, String(row.code ?? row.errorCode ?? row.kind ?? ""))}
                  {row.partialTargetMayRemain ? ` ${t("partialTargetMayRemain")}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {outcome.pending.length > 0 && (
        <section className="panel" aria-labelledby="pending-title">
          <p className="eyebrow">{t("pending")}</p>
          <h2 id="pending-title">{t("pendingAfterFailure")}</h2>
          <ol className="file-list">
            {outcome.pending.map((row, i) => (
              <li key={i}>
                <bdi>{row.sourceLabel ?? ""}</bdi>
                <span> → </span>
                <bdi>{row.targetLabel ?? ""}</bdi>
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  );
}
