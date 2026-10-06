import type { HookContext } from "@w6w/types";
import { DEMO_HOST, errorText, OBJECTS_PATH, PRODUCTION_HOST } from "../lib/client.ts";

export type Environment = "production" | "demo";

export interface PardotCredential {
  accessToken?: string;
  businessUnitId?: string;
  environment?: Environment;
}

/** An Account Engagement business unit id begins `0Uv` and is 18 characters (authentication page). */
export const BUSINESS_UNIT_PATTERN = "^0Uv[A-Za-z0-9]{15}$";

export const hostFor = (environment: string | undefined): string =>
  environment === "demo" ? DEMO_HOST : PRODUCTION_HOST;

/** Shared connect-time fields. */
export const businessUnitField = {
  key: "businessUnitId",
  label: "Business Unit ID",
  type: "string" as const,
  required: true,
  placeholder: "0Uv…",
  hint:
    "Salesforce Setup → Business Unit Setup. Begins with `0Uv`, 18 characters. Sent as `Pardot-Business-Unit-Id` on every call.",
  validation: { pattern: BUSINESS_UNIT_PATTERN },
};

export const environmentField = {
  key: "environment",
  label: "Account Engagement environment",
  type: "select" as const,
  required: true,
  default: "production",
  options: [
    { value: "production", label: "Production (pi.pardot.com)" },
    { value: "demo", label: "Developer org or sandbox (pi.demo.pardot.com)" },
  ],
  hint:
    "The wrong choice fails as `201 Business Unit … not found or inactive`, the same error a bad business unit id gives.",
};

/**
 * Stamp both headers every Account Engagement call needs. The business unit id is
 * not a secret but it lives in the credential so one Connection = one business
 * unit, and `sign` is the one place that sees it.
 */
export function stamp<T extends { headers: Record<string, string> }>(
  request: T,
  credential: PardotCredential,
): T {
  request.headers["authorization"] = `Bearer ${credential.accessToken}`;
  request.headers["pardot-business-unit-id"] = credential.businessUnitId ?? "";
  return request;
}

/**
 * Credential check: read one campaign id. `GET …/campaigns?fields=id&limit=1` is
 * cheap, read-only and returns only ids — it never echoes the token. The verdict is
 * taken from the vendor's own `{code, message}` body, not the status code.
 */
export async function testCredential(
  credential: PardotCredential,
  ctx: HookContext,
): Promise<{ ok: boolean; message?: string }> {
  if (!credential.accessToken || !credential.businessUnitId) {
    return { ok: false, message: "credential missing accessToken or businessUnitId" };
  }
  const host = hostFor(credential.environment);
  const res = await ctx.fetch(`https://${host}${OBJECTS_PATH}/campaigns?fields=id&limit=1`, {
    headers: {
      authorization: `Bearer ${credential.accessToken}`,
      "pardot-business-unit-id": credential.businessUnitId,
      accept: "application/json",
    },
  });
  const text = await res.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch { /* non-JSON: not an Account Engagement answer */ }
  if (res.ok && typeof payload === "object" && payload !== null && "values" in payload) {
    return { ok: true };
  }
  const detail = errorText(payload);
  return {
    ok: false,
    message: detail
      ? `Account Engagement rejected the credential: ${detail}`
      : `Account Engagement answered HTTP ${res.status} without a recognisable body`,
  };
}

/** What `afterConnect` records on the connection's redacted `display`. */
export function connectionDisplay(credential: PardotCredential) {
  const host = hostFor(credential.environment);
  return {
    host,
    businessUnitId: credential.businessUnitId,
    org: { name: credential.businessUnitId ?? host },
  };
}
