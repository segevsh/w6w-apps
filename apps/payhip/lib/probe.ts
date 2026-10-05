import type { HookContext } from "@w6w/types";

/**
 * Connection test shared by both auth methods: a verify of a key that cannot exist.
 *
 * Payhip has no whoami endpoint, and answers an empty body for a wrong secret AND for an unknown
 * key, so the secret cannot be proven good until a real license is verified. What this proves is
 * reachability and that Payhip did not refuse the request at the edge (401/403) or fail (5xx).
 * The probe key never matches a real license and verify is read-only, so it burns no use. It
 * reads only the status, never echoes the credential.
 */
export async function probe(
  ctx: HookContext,
  url: string,
  headers: Record<string, string>,
): Promise<{ ok: boolean; message?: string }> {
  const res = await ctx.fetch(url, { headers: { accept: "application/json", ...headers } });
  await res.text().catch(() => "");
  if (res.status === 401 || res.status === 403) {
    return { ok: false, message: `Payhip rejected the request (${res.status}). Check the key.` };
  }
  if (res.status >= 500 || res.status === 429) {
    return { ok: false, message: `Payhip returned HTTP ${res.status}; try again shortly.` };
  }
  return { ok: true };
}
