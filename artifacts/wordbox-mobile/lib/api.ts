import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const getBaseUrl = () => `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

let _sessionCookie: string | null = null;

export async function initApiCookie(): Promise<void> {
  try {
    _sessionCookie = await AsyncStorage.getItem("session_cookie");
  } catch {
    _sessionCookie = null;
  }
}

export async function clearApiCookie(): Promise<void> {
  _sessionCookie = null;
  try {
    await AsyncStorage.removeItem("session_cookie");
  } catch {}
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (Platform.OS !== "web" && _sessionCookie) {
    headers["Cookie"] = _sessionCookie;
  }

  const response = await fetch(`${getBaseUrl()}/api${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (Platform.OS !== "web") {
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      const cookiePart = setCookie.split(";")[0];
      _sessionCookie = cookiePart;
      try {
        await AsyncStorage.setItem("session_cookie", cookiePart);
      } catch {}
    }
  }

  return response;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}
