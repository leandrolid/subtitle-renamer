import { Captions } from "lucide-react";
import appIconSrc from "../app-icon.svg";

interface Props {
  title: string;
  rightSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
}

export function TitleBar({ title, rightSlot, leftSlot }: Props) {
  return (
    <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-2.5">
      <div className="flex items-center">{leftSlot}</div>
      <div className="mx-auto flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md bg-brand text-brand-foreground">
          <Captions className="size-3.5" />
          <img src={appIconSrc} className="sr-only" alt="" />
        </div>
        <span className="text-sm font-medium tracking-tight">{title}</span>
      </div>
      <div className="flex items-center">{rightSlot}</div>
    </header>
  );
}
