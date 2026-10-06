import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Personal access token — `Authorization: Bearer <token>`.
 * Created in the Back Office under Integrations > Access tokens
 * (`r.loyverse.com/dashboard/#/integrations/tokens`). The vendor warns that a
 * personal token "gives unlimited access to the targeted account".
 *
 * ## The probe: `GET /v1.0/merchant`
 *
 * Returns `{id, business_name, email, country, currency}` — no credential
 * material. Needs only the `MERCHANT_READ` scope, which a personal token has and
 * an OAuth token may be limited to. Unauthenticated (and with a bogus token) it
 * answers `401 {"errors":[{"code":"UNAUTHORIZED","details":"Access token is not
 * valid."}]}`, measured 2026-10-06 — so it genuinely requires a credential.
 */
export const PROBE_PATH = "/merchant";

export interface LoyverseCredential {
  accessToken: string;
}

export function authHeaders(credential: Partial<LoyverseCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.accessToken ?? ""}` };
}

interface ErrBody {
  errors?: Array<{ code?: string; details?: string }>;
}

/** Classify a failed probe from the vendor's error `code`, with the status as a hint. */
export async function classifyProbeFailure(res: Response): Promise<{ ok: false; message: string }> {
  const body = await res.json().catch(() => null) as ErrBody | null;
  const code = body?.errors?.[0]?.code;
  const details = body?.errors?.[0]?.details;
  if (code === "UNAUTHORIZED") {
    return {
      ok: false,
      message: `Loyverse rejected the token (${details ?? "UNAUTHORIZED"}). Check it was copied ` +
        "exactly and has not been deleted in the Back Office.",
    };
  }
  if (code === "PAYMENT_REQUIRED") {
    return { ok: false, message: "Loyverse subscription for this account has lapsed" };
  }
  if (code === "FORBIDDEN") {
    return {
      ok: false,
      message: "Loyverse refused the merchant read: the token lacks MERCHANT_READ",
    };
  }
  return {
    ok: false,
    message: `Loyverse returned HTTP ${res.status}${code ? ` ${code}` : ""} for ${PROBE_PATH}`,
  };
}

async function probe(accessToken: string, ctx: Parameters<NonNullable<AuthDefinition["test"]>>[1]) {
  const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
    headers: { accept: "application/json", ...authHeaders({ accessToken }) },
  });
  if (res.ok) return { ok: true as const };
  return await classifyProbeFailure(res);
}

/** Business name only; `email` is left behind. Silent on failure. */
async function label(
  accessToken: string,
  ctx: Parameters<NonNullable<AuthDefinition["test"]>>[1],
): Promise<Record<string, unknown>> {
  try {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ accessToken }) },
    });
    if (!res.ok) return {};
    const body = await res.json() as { business_name?: string; id?: string };
    if (!body?.business_name) return {};
    return { businessName: body.business_name, merchantId: body.id };
  } catch {
    return {};
  }
}

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Personal access token",
  description:
    "Paste a personal access token from the Loyverse Back Office > Integrations > Access tokens.",
  connectionLabel: "Loyverse ({{businessName}})",
  fields: [
    {
      key: "accessToken",
      label: "Access token",
      type: "secret",
      required: true,
      hint: "Back Office > Integrations > Access tokens. It grants full access to the account.",
    },
  ],

  sign({ request, credential }) {
    for (const [name, value] of Object.entries(authHeaders(credential as LoyverseCredential))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const token = ((credential as Partial<LoyverseCredential>)?.accessToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing accessToken" };
    return await probe(token, ctx);
  },

  async afterConnect({ credential }, ctx) {
    return await label(
      ((credential as Partial<LoyverseCredential>)?.accessToken ?? "").trim(),
      ctx,
    );
  },
};

export default accessToken;
