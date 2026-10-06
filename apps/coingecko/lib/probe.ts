/**
 * The credential probe shared by both auth methods' `test` hook.
 *
 * `GET /ping` is the probe, but ONLY with the key header attached: measured
 * 2026-10-06, an unauthenticated `/ping` on the demo host answers 200 (so it proves
 * nothing about a key), while the same request carrying an unknown key answers 401
 * `error_code 10002` "API Key Missing". The body's `gecko_says` is the positive
 * signal; the verdict comes from the body, never from the status line alone.
 *
 * `test` runs before a Connection exists, so the header is built by hand here —
 * only `sign` is auto-signed.
 */
import type { HookContext } from "@w6w/types";
import { DEMO_ORIGIN, errorDetail, HEADER_BY_PLAN, type Plan, PRO_ORIGIN } from "./client.ts";

export async function probeKey(
  plan: Plan,
  apiKey: string | undefined,
  ctx: HookContext,
): Promise<{ ok: boolean; message?: string }> {
  if (!apiKey) return { ok: false, message: "credential missing apiKey" };
  const origin = plan === "pro" ? PRO_ORIGIN : DEMO_ORIGIN;
  const res = await ctx.fetch(`${origin}/api/v3/ping`, {
    headers: { [HEADER_BY_PLAN[plan]]: apiKey, accept: "application/json" },
  });
  const text = await res.text().catch(() => "");
  let body: { gecko_says?: unknown } | null = null;
  try {
    body = JSON.parse(text);
  } catch {
    // classified below from the (non-JSON) text
  }
  if (typeof body?.gecko_says === "string") return { ok: true };

  const { code, message } = errorDetail(text);
  if (code === 10002) {
    return {
      ok: false,
      message: `CoinGecko did not accept this ${plan} API key (10002: ${message.split(".")[0]}).`,
    };
  }
  if (code === 10010 || code === 10011) {
    return {
      ok: false,
      message: `CoinGecko says this key belongs to the other plan's host (${code}). ` +
        `Use the ${plan === "demo" ? "Pro" : "Demo"} API Key auth method instead.`,
    };
  }
  return {
    ok: false,
    message: `CoinGecko returned ${res.status}${code ? ` (${code})` : ""}: ${message}`,
  };
}
