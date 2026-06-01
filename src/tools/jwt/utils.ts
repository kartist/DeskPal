import { jwtDecode } from "jwt-decode";

export interface JwtResult {
  header: Record<string, any>;
  payload: Record<string, any>;
}

export function parseJwt(token: string): JwtResult {
  const header = jwtDecode(token, { header: true });
  const payload = jwtDecode(token);
  return {
    header: header as Record<string, any>,
    payload: payload as Record<string, any>,
  };
}
