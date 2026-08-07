import type { VisibleStep } from "../types.ts";

interface Props {
  visibleStep: VisibleStep;
  t: (key: string) => string;
}

const STEPS: { id: VisibleStep; labelKey: string; descKey: string; className: string }[] = [
  {
    id: "choose-folder",
    labelKey: "progressChooseFolder",
    descKey: "progressChooseFolderDescription",
    className: "progress-step--choose",
  },
  {
    id: "review-plan",
    labelKey: "progressReviewMapping",
    descKey: "progressReviewMappingDescription",
    className: "progress-step--review",
  },
  {
    id: "confirm-copy",
    labelKey: "progressConfirmCopy",
    descKey: "progressConfirmCopyDescription",
    className: "progress-step--confirm",
  },
];

export function ProgressTracker({ visibleStep, t }: Props) {
  return (
    <section
      className="progress-tracker"
      aria-label={t("progressLabel")}
    >
      <ol className="progress-tracker__list">
        {STEPS.map((step, i) => (
          <li key={step.id}>
            <li
              className={`progress-step ${step.className}`}
              data-progress-step={step.id}
              aria-current={visibleStep === step.id ? "step" : undefined}
            >
              <span className="progress-step__marker" aria-hidden="true">
                <span className="progress-step__number">{i + 1}</span>
              </span>
              <span className="progress-step__copy">
                <span className="progress-step__label">{t(step.labelKey)}</span>
                <span className="progress-step__description">{t(step.descKey)}</span>
              </span>
            </li>
            {i < STEPS.length - 1 && (
              <li
                className="progress-tracker__connector"
                aria-hidden="true"
                data-progress-connector={
                  i === 0 ? "choose-review" : "review-confirm"
                }
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
