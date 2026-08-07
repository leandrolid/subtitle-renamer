import { Settings } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "../lib/utils.ts";
import type { Locale, Theme } from "../types.ts";

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
  const menuRef = useRef<HTMLUListElement>(null);
  const themeMenuRef = useRef<HTMLUListElement>(null);
  const langMenuRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuOpen = useRef(false);
  const activeSub = useRef<"theme" | "lang" | null>(null);

  function closeAll(restoreFocus = true) {
    if (menuRef.current) menuRef.current.hidden = true;
    if (themeMenuRef.current) themeMenuRef.current.hidden = true;
    if (langMenuRef.current) langMenuRef.current.hidden = true;
    if (buttonRef.current)
      buttonRef.current.setAttribute("aria-expanded", "false");
    menuOpen.current = false;
    activeSub.current = null;
    if (restoreFocus && buttonRef.current) buttonRef.current.focus();
  }

  function openMenu(focusTarget: "first" | "last" = "first") {
    if (!menuRef.current) return;
    menuRef.current.hidden = false;
    buttonRef.current?.setAttribute("aria-expanded", "true");
    menuOpen.current = true;
    const items = Array.from(
      menuRef.current.querySelectorAll<HTMLElement>(
        ':scope > li > [role^="menuitem"]',
      ),
    );
    if (focusTarget === "last") items[items.length - 1]?.focus();
    else items[0]?.focus();
  }

  function openSub(which: "theme" | "lang") {
    const ref = which === "theme" ? themeMenuRef : langMenuRef;
    if (!ref.current) return;
    if (which === "theme" && langMenuRef.current)
      langMenuRef.current.hidden = true;
    if (which === "lang" && themeMenuRef.current)
      themeMenuRef.current.hidden = true;
    ref.current.hidden = false;
    activeSub.current = which;
    const checked = ref.current.querySelector<HTMLElement>(
      '[aria-checked="true"]',
    );
    const first = ref.current.querySelector<HTMLElement>('[role^="menuitem"]');
    (checked ?? first)?.focus();
  }

  function closeSub(restoreFocus = true) {
    if (!activeSub.current) return;
    const ref = activeSub.current === "theme" ? themeMenuRef : langMenuRef;
    const btn =
      activeSub.current === "theme"
        ? menuRef.current?.querySelector<HTMLElement>('[data-submenu="theme"]')
        : menuRef.current?.querySelector<HTMLElement>('[data-submenu="lang"]');
    if (ref.current) ref.current.hidden = true;
    activeSub.current = null;
    if (restoreFocus && btn) btn.focus();
  }

  function itemsOf(el: HTMLElement) {
    return Array.from(
      el.querySelectorAll<HTMLElement>(':scope > li > [role^="menuitem"]'),
    );
  }

  function move(el: HTMLElement, cur: HTMLElement, d: number) {
    const items = itemsOf(el);
    const idx = items.indexOf(cur);
    items[(idx + d + items.length) % items.length]?.focus();
  }

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (
        menuOpen.current &&
        !buttonRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        closeAll(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function handleKeydown(e: React.KeyboardEvent<HTMLUListElement>) {
    const target = (e.target as HTMLElement).closest<HTMLElement>(
      '[role^="menuitem"]',
    );
    if (!target) return;
    const inSub =
      themeMenuRef.current?.contains(target) ||
      langMenuRef.current?.contains(target);
    const parent = inSub
      ? (themeMenuRef.current?.contains(target)
          ? themeMenuRef.current
          : langMenuRef.current)!
      : menuRef.current!;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(parent, target, 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(parent, target, -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      itemsOf(parent)[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      itemsOf(parent).at(-1)?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate(target);
    } else if (
      e.key === "ArrowRight" &&
      target.getAttribute("aria-haspopup") === "menu"
    ) {
      e.preventDefault();
      openSub(target.dataset.submenu as "theme" | "lang");
    } else if (e.key === "ArrowLeft" && inSub) {
      e.preventDefault();
      closeSub(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      inSub ? closeSub(true) : closeAll(true);
    } else if (e.key === "Tab") {
      closeAll(false);
    }
  }

  function activate(el: HTMLElement) {
    if (el.dataset.themeChoice) {
      onSetTheme(el.dataset.themeChoice as Theme);
      closeAll(true);
    } else if (el.dataset.localeChoice) {
      onSetLocale(el.dataset.localeChoice as Locale);
      closeAll(true);
    } else if (el.getAttribute("aria-haspopup") === "menu")
      openSub(el.dataset.submenu as "theme" | "lang");
  }

  const itemCls =
    "w-full min-h-10 px-3 py-2 flex items-center justify-between gap-4 border-0 rounded bg-transparent text-foreground text-sm text-start cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:bg-muted";

  return (
    <div className="relative z-10">
      <button
        ref={buttonRef}
        type="button"
        id="settings-menu-button"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-controls="settings-menu"
        className={cn(
          itemCls,
          "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm min-h-0 hover:border-brand",
        )}
        onClick={() => (menuOpen.current ? closeAll(true) : openMenu("first"))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openMenu("first");
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            openMenu("last");
          }
        }}
      >
        <Settings className="size-4" />
      </button>

      <ul
        ref={menuRef}
        id="settings-menu"
        role="menu"
        aria-labelledby="settings-menu-button"
        hidden
        className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-48 list-none overflow-hidden rounded-xl border border-border bg-card p-2 shadow-lg"
        onKeyDown={handleKeydown}
        onClick={(e) => {
          const t2 = (e.target as HTMLElement).closest<HTMLElement>(
            '[role^="menuitem"]',
          );
          if (t2) activate(t2);
        }}
      >
        <li role="none" className="relative">
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="theme-menu"
            data-submenu="theme"
            className={itemCls}
          >
            <span>{t("theme")}</span>
            <span className="text-muted-foreground">›</span>
          </button>
          <ul
            ref={themeMenuRef}
            id="theme-menu"
            role="menu"
            aria-label={t("theme")}
            hidden
            className="absolute right-[calc(100%+8px)] top-0 min-w-40 list-none overflow-hidden rounded-xl border border-border bg-card p-2 shadow-lg"
          >
            {THEMES.map(({ value, labelKey }) => (
              <li key={value} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={themePreference === value ? "true" : "false"}
                  data-theme-choice={value}
                  className={cn(
                    itemCls,
                    themePreference === value && "font-medium",
                  )}
                >
                  {themePreference === value && (
                    <span className="mr-1 text-brand">•</span>
                  )}
                  {t(labelKey)}
                </button>
              </li>
            ))}
          </ul>
        </li>
        <li role="none" className="relative">
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="language-menu"
            data-submenu="lang"
            className={itemCls}
          >
            <span>{t("language")}</span>
            <span className="text-muted-foreground">›</span>
          </button>
          <ul
            ref={langMenuRef}
            id="language-menu"
            role="menu"
            aria-label={t("language")}
            hidden
            className="absolute right-[calc(100%+8px)] top-0 min-w-48 list-none overflow-hidden rounded-xl border border-border bg-card p-2 shadow-lg"
          >
            {LOCALES.map(({ value, labelKey }) => (
              <li key={value} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={locale === value ? "true" : "false"}
                  data-locale-choice={value}
                  className={cn(itemCls, locale === value && "font-medium")}
                >
                  {locale === value && (
                    <span className="mr-1 text-brand">•</span>
                  )}
                  {t(labelKey)}
                </button>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </div>
  );
}
