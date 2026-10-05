import type { HookContext } from "@w6w/types";
import { API_URL, describeError, type InstagramErrorBody } from "../lib/client.ts";

/**
 * Shared credential probe: `GET /me?fields=id`.
 *
 * `/me` answers with the id of whoever owns the token (a Facebook User, or the
 * Page itself for a Page token) and never echoes the credential. The verdict is
 * read from the response BODY — Meta's `error` object with its own `code` (190 =
 * invalid/expired token) — and not from the status alone: a 200 whose body has no
 * `id` is not a live credential either.
 */
export async function probe(
  accessToken: string,
  ctx: HookContext,
): Promise<{ ok: boolean; message?: string }> {
  const res = await ctx.fetch(`${API_URL}/me?fields=id`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  let body: (InstagramErrorBody & { id?: string }) | undefined;
  try {
    body = JSON.parse(await res.text());
  } catch {
    body = undefined;
  }
  const described = describeError(body);
  if (described) {
    return { ok: false, message: `Instagram Graph API rejected the token: ${described}` };
  }
  if (!res.ok) return { ok: false, message: `Instagram Graph API returned ${res.status}` };
  if (!body?.id) return { ok: false, message: "Instagram Graph API answered without an id" };
  return { ok: true };
}
