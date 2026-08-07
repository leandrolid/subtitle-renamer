import { getCurrentWindow } from "@tauri-apps/api/window";
import { Captions, Copy, Minus, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import appIconSrc from "../app-icon.svg";
import { Button } from "./ui/button.tsx";

interface Props {
  readonly title: string;
  readonly rightSlot?: React.ReactNode;
  readonly leftSlot?: React.ReactNode;
}

export function TitleBar({ title, rightSlot, leftSlot }: Props) {
  const appWindow = "__TAURI_INTERNALS__" in window ? getCurrentWindow() : null;

  return (
    <header
      className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-card py-2.5"
      onMouseDown={async (event) => {
        if (
          event.button !== 0 ||
          (event.target instanceof Element && event.target.closest("button"))
        ) {
          return;
        }
        if (appWindow) {
          await (event.detail === 2 ? appWindow.toggleMaximize() : appWindow.startDragging());
        }
      }}
    >
      <div className="flex items-center justify-self-start pl-4">{leftSlot}</div>
      <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md bg-brand text-brand-foreground">
          <Captions className="size-3.5" />
          <img src={appIconSrc} className="sr-only" alt="" />
        </div>
        <span className="text-sm font-medium tracking-tight">{title}</span>
      </div>
      <div className="flex items-center justify-self-end">{rightSlot}</div>
    </header>
  );
}

interface WindowControlsProps {
  readonly t: (key: string) => string;
}

export function WindowControls({ t }: WindowControlsProps) {
  const appWindow = "__TAURI_INTERNALS__" in window ? getCurrentWindow() : null;
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!appWindow) {
      return;
    }
    const syncMaximized = async () => setIsMaximized(await appWindow.isMaximized());
    void syncMaximized();
    const unlisten = appWindow.onResized(syncMaximized);
    return () => {
      void unlisten.then((stop) => stop());
    };
  }, []);

  return (
    <div className="flex items-center" role="group" aria-label={t("windowControls")}>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-none"
        aria-label={t("minimizeWindow")}
        onClick={() => appWindow?.minimize()}
      >
        <Minus className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-none"
        aria-label={t(isMaximized ? "restoreWindow" : "maximizeWindow")}
        onClick={() => appWindow?.toggleMaximize()}
      >
        {isMaximized ? <Copy className="size-3.5" /> : <Square className="size-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-none hover:bg-destructive hover:text-white dark:hover:bg-destructive"
        aria-label={t("closeWindow")}
        onClick={() => appWindow?.close()}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
