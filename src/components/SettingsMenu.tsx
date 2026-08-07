import { useRef, useEffect } from "react";
import type { Theme, Locale } from "../types.ts";

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

export function SettingsMenu({ t, locale, themePreference, onSetTheme, onSetLocale }: Props) {
  const menuRef = useRef<HTMLUListElement>(null);
  const themeMenuRef = useRef<HTMLUListElement>(null);
  const langMenuRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const menuOpen = useRef(false);
  const activeSubmenu = useRef<"theme" | "lang" | null>(null);

  function closeAll(restoreFocus = true) {
    if (menuRef.current) menuRef.current.hidden = true;
    if (themeMenuRef.current) themeMenuRef.current.hidden = true;
    if (langMenuRef.current) langMenuRef.current.hidden = true;
    if (buttonRef.current) buttonRef.current.setAttribute("aria-expanded", "false");
    menuOpen.current = false;
    activeSubmenu.current = null;
    if (restoreFocus && buttonRef.current) buttonRef.current.focus();
  }

  function openMenu(focusTarget: "first" | "last" = "first") {
    if (!menuRef.current) return;
    menuRef.current.hidden = false;
    buttonRef.current?.setAttribute("aria-expanded", "true");
    menuOpen.current = true;
    const items = Array.from(
      menuRef.current.querySelectorAll<HTMLElement>(":scope > li > [role^='menuitem']"),
    );
    if (focusTarget === "last") items[items.length - 1]?.focus();
    else items[0]?.focus();
  }

  function openSubmenu(which: "theme" | "lang") {
    const ref = which === "theme" ? themeMenuRef : langMenuRef;
    if (!ref.current) return;
    if (which === "theme" && langMenuRef.current) langMenuRef.current.hidden = true;
    if (which === "lang" && themeMenuRef.current) themeMenuRef.current.hidden = true;
    ref.current.hidden = false;
    activeSubmenu.current = which;
    const checked = ref.current.querySelector<HTMLElement>("[aria-checked='true']");
    const first = ref.current.querySelector<HTMLElement>("[role^='menuitem']");
    (checked ?? first)?.focus();
  }

  function closeSubmenu(restoreFocus = true) {
    if (!activeSubmenu.current) return;
    const ref = activeSubmenu.current === "theme" ? themeMenuRef : langMenuRef;
    const btn =
      activeSubmenu.current === "theme"
        ? menuRef.current?.querySelector<HTMLElement>("[data-submenu='theme']")
        : menuRef.current?.querySelector<HTMLElement>("[data-submenu='lang']");
    if (ref.current) ref.current.hidden = true;
    activeSubmenu.current = null;
    if (restoreFocus && btn) btn.focus();
  }

  function menuItemsOf(el: HTMLElement): HTMLElement[] {
    return Array.from(el.querySelectorAll<HTMLElement>(":scope > li > [role^='menuitem']"));
  }

  function moveInMenu(el: HTMLElement, current: HTMLElement, delta: number) {
    const items = menuItemsOf(el);
    const idx = items.indexOf(current);
    items[(idx + delta + items.length) % items.length]?.focus();
  }

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        menuOpen.current &&
        !buttonRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        closeAll(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function handleMenuKeydown(e: React.KeyboardEvent<HTMLUListElement>) {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[role^='menuitem']");
    if (!target) return;

    // Determine which menu the target is in
    const inSub = themeMenuRef.current?.contains(target) || langMenuRef.current?.contains(target);
    const parentMenu = inSub
      ? (themeMenuRef.current?.contains(target) ? themeMenuRef.current : langMenuRef.current)!
      : menuRef.current!;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveInMenu(parentMenu, target, 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveInMenu(parentMenu, target, -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      menuItemsOf(parentMenu)[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const endItems = menuItemsOf(parentMenu); endItems[endItems.length - 1]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activateItem(target);
    } else if (e.key === "ArrowRight" && target.getAttribute("aria-haspopup") === "menu") {
      e.preventDefault();
      const sub = target.dataset.submenu as "theme" | "lang" | undefined;
      if (sub) openSubmenu(sub);
    } else if (e.key === "ArrowLeft" && inSub) {
      e.preventDefault();
      closeSubmenu(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (inSub) closeSubmenu(true);
      else closeAll(true);
    } else if (e.key === "Tab") {
      closeAll(false);
    }
  }

  function activateItem(el: HTMLElement) {
    const themeVal = el.dataset.themeChoice as Theme | undefined;
    const localeVal = el.dataset.localeChoice as Locale | undefined;
    if (themeVal) {
      onSetTheme(themeVal);
      closeAll(true);
    } else if (localeVal) {
      onSetLocale(localeVal);
      closeAll(true);
    } else if (el.getAttribute("aria-haspopup") === "menu") {
      const sub = el.dataset.submenu as "theme" | "lang" | undefined;
      if (sub) openSubmenu(sub);
    }
  }

  return (
    <div className="settings-menu" data-settings-menu>
      <button
        ref={buttonRef}
        className="button button--secondary"
        type="button"
        id="settings-menu-button"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-controls="settings-menu"
        onClick={() => {
          if (menuOpen.current) closeAll(true);
          else openMenu("first");
        }}
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
        {t("settings")}
      </button>
      <ul
        ref={menuRef}
        id="settings-menu"
        role="menu"
        aria-labelledby="settings-menu-button"
        hidden
        onKeyDown={handleMenuKeydown}
        onClick={(e) => {
          const target = (e.target as HTMLElement).closest<HTMLElement>("[role^='menuitem']");
          if (target) activateItem(target);
        }}
      >
        {/* Theme submenu */}
        <li role="none">
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="theme-menu"
            data-submenu="theme"
          >
            {t("theme")}
          </button>
          <ul
            ref={themeMenuRef}
            id="theme-menu"
            role="menu"
            aria-label={t("theme")}
            hidden
          >
            {THEMES.map(({ value, labelKey }) => (
              <li key={value} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={themePreference === value ? "true" : "false"}
                  data-theme-choice={value}
                >
                  {t(labelKey)}
                </button>
              </li>
            ))}
          </ul>
        </li>
        {/* Language submenu */}
        <li role="none">
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="language-menu"
            data-submenu="lang"
          >
            {t("language")}
          </button>
          <ul
            ref={langMenuRef}
            id="language-menu"
            role="menu"
            aria-label={t("language")}
            hidden
          >
            {LOCALES.map(({ value, labelKey }) => (
              <li key={value} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={locale === value ? "true" : "false"}
                  data-locale-choice={value}
                >
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
