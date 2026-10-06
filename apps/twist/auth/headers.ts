/**
 * The one place the wire format of a Twist credential is built, shared by both auth methods'
 * `sign` and `test` so a probe cannot send a header the real requests do not.
 *
 * Twist takes `Authorization: Bearer <token>` for both an OAuth access token and the personal
 * test token (verified against the "General access" example in the v3 reference, 2026-10-06).
 */
export function bearer(token: string | undefined): Record<string, string> {
  return { authorization: `Bearer ${token ?? ""}` };
}
