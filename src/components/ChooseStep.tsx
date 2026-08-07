import type { Phase, VisibleStep, EmptyStateContent } from "../types.ts";

interface Props {
  t: (key: string) => string;
  phase: Phase;
  visibleStep: VisibleStep;
  selectedDirectoryLabel: string;
  emptyState: EmptyStateContent;
  onSelectFolder: () => void;
  selectDisabled: boolean;
}

export function ChooseStep({
  t,
  phase,
  visibleStep,
  selectedDirectoryLabel,
  emptyState,
  onSelectFolder,
  selectDisabled,
}: Props) {
  const isVisible = visibleStep === "choose-folder";

  return (
    <section
      className="workflow workflow--choose"
      aria-labelledby="folder-title"
      data-workflow-region="choose-folder"
      data-selected-folder-area
      style={{ display: isVisible ? undefined : "none" }}
    >
      <div className="step-intro">
        <p className="eyebrow">{t("selectedFolder")}</p>
        <h2 id="folder-title">{t("chooseTitle")}</h2>
        <p>{t("chooseBody")}</p>
      </div>

      <button
        className="folder-surface"
        type="button"
        onClick={onSelectFolder}
        disabled={selectDisabled}
      >
        <span className="folder-surface__icon" aria-hidden="true" />
        <span className="folder-surface__title">{t("selectFolder")}</span>
        <span className="folder-surface__body">{t("folderSurfaceBody")}</span>
      </button>

      <p className="folder-path" data-folder-label>
        <bdi>
          {selectedDirectoryLabel || t("noFolderSelected")}
        </bdi>
      </p>

      <p className="hint">{t("folderHint")}</p>

      <div className="extension-cards" aria-label={t("supportedFilesLabel")}>
        <article className="extension-card">
          <h3>{t("videoFiles")}</h3>
          <p>mkv, mp4, avi, mov, m4v, webm</p>
        </article>
        <article className="extension-card">
          <h3>{t("subtitleFiles")}</h3>
          <p>ass, ssa, srt, vtt</p>
        </article>
      </div>

      <button
        className="button button--primary button--wide"
        type="button"
        onClick={onSelectFolder}
        disabled={selectDisabled || phase === "scanning" || phase === "selecting"}
      >
        {t("scanFolder")}
      </button>

      {/* Empty state */}
      <section
        className="empty-state"
        aria-labelledby="empty-title"
        hidden={
          isVisible &&
          phase === "idle" &&
          !selectedDirectoryLabel
            ? true
            : false
        }
      >
        <p className="eyebrow">{t("noPlanLoaded")}</p>
        <h2 id="empty-title">{t(emptyState.titleKey)}</h2>
        <p>{t(emptyState.bodyKey)}</p>
      </section>
    </section>
  );
}
