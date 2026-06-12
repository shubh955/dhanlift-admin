// Client-side only — do not import from Server Components or Server Actions.
import type { AuthTokens } from "@/lib/auth";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function saveTokens(tokens: AuthTokens) {
  localStorage.setItem(ACCESS_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  // Mirror into cookies so the proxy can enforce route protection
  setCookie(ACCESS_KEY, tokens.access_token, 60 * 15);       // 15 min
  setCookie(REFRESH_KEY, tokens.refresh_token, 60 * 60 * 24 * 7); // 7 days
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  deleteCookie(ACCESS_KEY);
  deleteCookie(REFRESH_KEY);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}
