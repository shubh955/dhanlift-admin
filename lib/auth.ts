const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://dhanlift.weqtech.com/api";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: number | string;
  username: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * POST /v1/auth/login  (x-www-form-urlencoded, OAuth2 password flow)
 */
export async function login(
  username: string,
  password: string
): Promise<AuthTokens> {
  const body = new URLSearchParams({
    grant_type: "password",
    username,
    password,
    scope: "",
    client_id: "",
    client_secret: "",
  });

  const res = await fetch(`${BASE}/v1/auth/login`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(data.detail ?? "Invalid username or password");
  }

  return res.json();
}

/**
 * POST /v1/auth/refresh  (JSON body)
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthTokens> {
  const res = await fetch(`${BASE}/v1/auth/refresh`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) throw new Error("Session expired. Please log in again.");
  return res.json();
}

/**
 * GET /v1/auth/me  (Bearer token)
 */
export async function getCurrentUser(
  accessToken: string
): Promise<CurrentUser | null> {
  const res = await fetch(`${BASE}/v1/auth/me`, {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}
