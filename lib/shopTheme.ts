export type ShopTheme = {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
};

type ThemeSource = {
  themePrimary?: string | null;
  themeSecondary?: string | null;
  themeAccent?: string | null;
  themeSurface?: string | null;
};

const DEFAULT_THEME: ShopTheme = {
  primary: "#7f1d1d",
  secondary: "#b91c1c",
  accent: "#ef4444",
  surface: "#fff7ed",
};

function isHexColor(value: string | null | undefined) {
  return Boolean(value && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(value.trim()));
}

function normalizeHex(value: string | null | undefined, fallback: string) {
  return isHexColor(value) ? value!.trim() : fallback;
}

export function hexToRgb(hex: string) {
  const sanitized = hex.replace("#", "");
  const full =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((char) => char + char)
          .join("")
      : sanitized;

  const bigint = Number.parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `${r}, ${g}, ${b}`;
}

export function withAlpha(hex: string, alpha: number) {
  return `rgba(${hexToRgb(hex)}, ${alpha})`;
}

export function resolveShopTheme(source?: ThemeSource | null): ShopTheme {
  return {
    primary: normalizeHex(source?.themePrimary, DEFAULT_THEME.primary),
    secondary: normalizeHex(source?.themeSecondary, DEFAULT_THEME.secondary),
    accent: normalizeHex(source?.themeAccent, DEFAULT_THEME.accent),
    surface: normalizeHex(source?.themeSurface, DEFAULT_THEME.surface),
  };
}
