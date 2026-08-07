import { Settings } from "lucide-react";
import { cn } from "../lib/utils.ts";
import type { Locale, Theme } from "../types.ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.tsx";

interface Props {
  t: (key: string) => string;
  locale: Locale;
  themePreference: Theme;
  onSetTheme: (theme: Theme) => void;
  onSetLocale: (locale: Locale) => void;
}

const THEMES: { value: Theme; labelKey: string }[] = [
  { value: "system", labelKey: "themeSystem" },
  { value: "light", labelKey: "themeLight" },
  { value: "dark", labelKey: "themeDark" },
];

const LOCALES: { value: Locale; labelKey: string }[] = [
  { value: "en", labelKey: "languageEnglish" },
  { value: "pt-BR", labelKey: "languagePortugueseBrazil" },
];

export function SettingsMenu({
  t,
  locale,
  themePreference,
  onSetTheme,
  onSetLocale,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground",
          "hover:border-brand focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
          "cursor-pointer transition-colors",
        )}
        aria-label={t("settings")}
      >
        <Settings className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent side="bottom" align="end">
        {/* Theme submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {t("theme")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={themePreference}
              onValueChange={(v) => onSetTheme(v as Theme)}
            >
              {THEMES.map(({ value, labelKey }) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {t(labelKey)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Language submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {t("language")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(v) => onSetLocale(v as Locale)}
            >
              {LOCALES.map(({ value, labelKey }) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {t(labelKey)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
