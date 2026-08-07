import { Captions, Film, FolderOpen, HardDrive } from "lucide-react";
import type { EmptyStateContent, Phase, VisibleStep } from "../types.ts";
import { Button } from "./ui/button.tsx";

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
  if (visibleStep !== "choose-folder") return null;
  const isScanning = phase === "scanning" || phase === "selecting";

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 py-10 text-center cursor-default select-none">
      <div className="space-y-2">
        <h2 className="text-balance text-2xl font-semibold tracking-tight">
          {t("chooseTitle")}
        </h2>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {t("chooseBody")}
        </p>
      </div>

      <button
        type="button"
        onClick={onSelectFolder}
        disabled={selectDisabled}
        className="group flex w-full flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 transition-colors hover:border-brand hover:bg-brand-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-muted text-brand transition-transform group-hover:scale-105">
          <FolderOpen className="size-7" />
        </span>
        <span className="space-y-1">
          <span className="block text-sm font-medium">{t("selectFolder")}</span>
          <span className="block text-xs text-muted-foreground">
            {t("folderSurfaceBody")}
          </span>
        </span>
      </button>

      {selectedDirectoryLabel && (
        <div className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left">
          <HardDrive className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-sm text-muted-foreground">
            {selectedDirectoryLabel}
          </span>
          <span className="ml-auto shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
            {t("lastUsed") || "last used"}
          </span>
        </div>
      )}

      <div className="grid w-full grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left">
          <Film className="size-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t("videoFiles")}</p>
            <p className="text-xs text-muted-foreground">.mkv .mp4 .avi</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left">
          <Captions className="size-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t("subtitleFiles")}</p>
            <p className="text-xs text-muted-foreground">.srt .ass .vtt</p>
          </div>
        </div>
      </div>

      <Button
        variant="brand"
        size="lg"
        onClick={onSelectFolder}
        disabled={selectDisabled || isScanning}
        className="w-full !text-[0.875rem]"
      >
        {isScanning ? t("statusScanning") || "Scanning…" : t("scanFolder")}
      </Button>

      {!(phase === "idle" && !selectedDirectoryLabel) && (
        <section
          className="w-full rounded-xl border border-border bg-card p-4 text-left"
          aria-labelledby="empty-title"
        >
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("noPlanLoaded")}
          </p>
          <h3 id="empty-title" className="text-sm font-medium">
            {t(emptyState.titleKey)}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(emptyState.bodyKey)}
          </p>
        </section>
      )}
    </div>
  );
}
