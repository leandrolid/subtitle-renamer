import type { VisibleStep, CopyRow, SkipRow, Locale } from "../types.ts";
import { getSkipLabel } from "../i18n.ts";

interface Props {
  t: (key: string) => string;
  visibleStep: VisibleStep;
  copies: CopyRow[];
  skips: SkipRow[];
  locale: Locale;
  directoryLabel: string;
}

export function ReviewStep({ t, visibleStep, copies, skips, locale, directoryLabel }: Props) {
  const isVisible = visibleStep === "review-plan";
  const rowCount = copies.length + skips.length;

  return (
    <section
      className="workflow workflow--review"
      aria-labelledby="review-title"
      aria-label={t("copyReviewLabel")}
      data-workflow-region="review-plan"
      style={{ display: isVisible ? undefined : "none" }}
    >
      <div className="review-heading">
        <div>
          <h2 id="review-title">{t("reviewTitle")}</h2>
          <p className="review-directory">
            <bdi>{directoryLabel}</bdi>
          </p>
        </div>
        <div className="review-counts" aria-label={t("planCountsLabel")}>
          <span className="status-pill status-pill--success">
            <span>{copies.length}</span>{" "}
            <span>{t("readyCountLabel")}</span>
          </span>
          <span className="status-pill status-pill--warning">
            <span>{skips.length}</span>{" "}
            <span>{t("skippedCountLabel")}</span>
          </span>
        </div>
      </div>

      {rowCount > 0 ? (
        <section className="panel mapping-ledger" aria-labelledby="planned-title">
          <p className="eyebrow">{t("plan")}</p>
          <h2 id="planned-title">{t("plannedCopies")}</h2>
          <table className="mapping-table">
            <thead>
              <tr>
                <th scope="col">{t("sourceSubtitle")}</th>
                <th scope="col" className="mapping-table__arrow-head" aria-label={t("mapsToLabel")} />
                <th scope="col">{t("targetOrReason")}</th>
                <th scope="col">{t("statusColumn")}</th>
              </tr>
            </thead>
            <tbody>
              {copies.map((row, i) => (
                <tr key={i}>
                  <td><bdi>{row.sourceLabel ?? t("unknownSubtitle")}</bdi></td>
                  <td className="mapping-table__arrow-cell" aria-hidden="true">→</td>
                  <td><bdi>{row.targetLabel ?? t("unknownTarget")}</bdi></td>
                  <td>
                    <span className="status-pill status-pill--success">
                      {t("readyForCopy")}
                    </span>
                  </td>
                </tr>
              ))}
              {skips.map((row, i) => (
                <tr key={`skip-${i}`}>
                  <td>
                    <bdi>{row.sourceLabel ?? row.label ?? t("unknownSubtitle")}</bdi>
                  </td>
                  <td className="mapping-table__arrow-cell" aria-hidden="true">→</td>
                  <td>
                    <bdi>
                      {getSkipLabel(locale, row.reasonCode ?? row.reason ?? "")}
                    </bdi>
                  </td>
                  <td>
                    <span className="status-pill status-pill--warning">
                      {t("skippedFallback")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="empty-state" aria-labelledby="empty-review-title">
          <p className="eyebrow">{t("noPlanLoaded")}</p>
          <h2 id="empty-review-title">{t("emptyNoFilesTitle")}</h2>
          <p>{t("emptyNoFilesBody")}</p>
        </section>
      )}
    </section>
  );
}
