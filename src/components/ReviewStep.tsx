import {
  AlertTriangle,
  ArrowRight,
  Captions,
  CheckCircle2,
  ChevronLeft,
  Film,
  XCircle,
} from "lucide-react";
import { getSkipLabel } from "../i18n.ts";
import { cn } from "../lib/utils.ts";
import type { CopyRow, Locale, SkipRow, VisibleStep } from "../types.ts";
import { Button } from "./ui/button.tsx";

type RowStatus = "matched" | "skipped" | "no-match";

const STATUS_META: Record<
  RowStatus,
  {
    label: (t: (k: string) => string) => string;
    icon: typeof CheckCircle2;
    className: string;
  }
> = {
  matched: {
    label: (t) => t("readyForCopy"),
    icon: CheckCircle2,
    className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  skipped: {
    label: (t) => t("skippedFallback"),
    icon: AlertTriangle,
    className: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
  "no-match": {
    label: (t) => t("skippedFallback"),
    icon: XCircle,
    className: "text-muted-foreground bg-muted border-border",
  },
};

function StatusBadge({
  status,
  t,
}: {
  status: RowStatus;
  t: (k: string) => string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        meta.className,
      )}
    >
      <Icon className="size-3" />
      {meta.label(t)}
    </span>
  );
}

interface Props {
  t: (key: string) => string;
  visibleStep: VisibleStep;
  copies: CopyRow[];
  skips: SkipRow[];
  locale: Locale;
  directoryLabel: string;
  onBack: () => void;
  onContinue: () => void;
  continueDisabled: boolean;
  backDisabled: boolean;
}

export function ReviewStep({
  t,
  visibleStep,
  copies,
  skips,
  locale,
  directoryLabel,
  onBack,
  onContinue,
  continueDisabled,
  backDisabled,
}: Props) {
  if (visibleStep !== "review-plan") return null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 py-8 cursor-default select-none">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {t("reviewTitle")}
          </h2>
          {directoryLabel && (
            <p className="font-mono text-xs text-muted-foreground">
              {directoryLabel}
            </p>
          )}
        </div>
        <div
          className="flex items-center gap-2 text-xs"
          aria-label={t("planCountsLabel")}
        >
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-400">
            {copies.length} {t("readyCountLabel")}
          </span>
          {skips.length > 0 && (
            <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-muted-foreground">
              {skips.length} {t("skippedCountLabel")}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[1fr_auto_1fr_7rem] items-center gap-4 border-b border-border bg-card/60 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>{t("sourceSubtitle")}</span>
          <span className="sr-only">{t("mapsToLabel")}</span>
          <span>{t("targetOrReason")}</span>
          <span className="text-right">{t("statusColumn")}</span>
        </div>
        <ul>
          {copies.map((row, i) => (
            <li
              key={i}
              className="grid grid-cols-[1fr_auto_1fr_7rem] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Captions className="size-4 shrink-0 text-brand" />
                <p className="truncate font-mono text-sm">
                  {row.sourceLabel ?? t("unknownSubtitle")}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 items-center gap-2.5">
                <Film className="size-4 shrink-0 text-muted-foreground" />
                <p className="truncate font-mono text-sm">
                  {row.targetLabel ?? t("unknownTarget")}
                </p>
              </div>
              <div className="flex justify-end">
                <StatusBadge status="matched" t={t} />
              </div>
            </li>
          ))}
          {skips.map((row, i) => (
            <li
              key={`skip-${i}`}
              className="grid grid-cols-[1fr_auto_1fr_7rem] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0 opacity-60"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Captions className="size-4 shrink-0 text-muted-foreground" />
                <p className="truncate font-mono text-sm">
                  {row.sourceLabel ?? row.label ?? t("unknownSubtitle")}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-border" />
              <div className="flex min-w-0 items-center gap-2.5">
                <Film className="size-4 shrink-0 text-border" />
                <p className="text-sm italic text-muted-foreground">
                  {getSkipLabel(locale, row.reasonCode ?? row.reason ?? "")}
                </p>
              </div>
              <div className="flex justify-end">
                <StatusBadge status="no-match" t={t} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={backDisabled}
          className="gap-1.5 !text-[0.875rem]"
        >
          <ChevronLeft className="size-4" />
          {t("back")}
        </Button>
        <Button
          variant="brand"
          onClick={onContinue}
          disabled={continueDisabled}
          className="gap-1.5 !text-[0.875rem]"
        >
          {t("continue")}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
