import type { AuthDefinition } from "@w6w/types";
import { API_BASE, type HibobErrorBody, V1, vendorMessage } from "../lib/client.ts";

export interface HibobCredential {
  serviceUserId: string;
  serviceUserToken: string;
}

/** `Basic base64("<service user id>:<token>")` — the documented header. */
export function basicHeader(credential: Partial<HibobCredential>): string {
  return `Basic ${btoa(`${credential.serviceUserId ?? ""}:${credential.serviceUserToken ?? ""}`)}`;
}

/**
 * `GET /v1/company/people/fields` — employee-field METADATA.
 *
 * Chosen because the reference states "Calling this endpoint does not require
 * any permissions for the service user", so a working credential with a thin
 * permission group still passes, and because its body is a list of field
 * definitions (id, category, type) — it never echoes the service user id or
 * token. Rate limit 50/min.
 */
export const PROBE_PATH = "/company/people/fields";

/**
 * Judge the probe from what came back, not the status line alone. Bob answers an
 * unauthenticated call with a 401 and an EMPTY body (measured), so the status is
 * the only signal on that arm — but a 200 only counts when the body is the
 * documented array of field definitions.
 */
export function classifyProbe(status: number, body: unknown): { ok: boolean; message?: string } {
  if (status >= 200 && status < 300) {
    if (Array.isArray(body) && body.every((f) => f && typeof f === "object" && "id" in f)) {
      return { ok: true };
    }
    return {
      ok: false,
      message: `Bob answered ${status} to ${PROBE_PATH} but not with the documented list of ` +
        "field definitions, so the credential could not be confirmed.",
    };
  }
  const vendor = vendorMessage(body && typeof body === "object" ? body as HibobErrorBody : null);
  const suffix = vendor ? `: ${vendor}` : "";
  if (status === 401) {
    return {
      ok: false,
      message: `Bob rejected the service user ID / token pair (401)${suffix}. Re-copy both from ` +
        "Settings > Integrations > Service users, or create a new service user.",
    };
  }
  if (status === 403) {
    return {
      ok: false,
      message: `Bob refused ${PROBE_PATH} (403)${suffix}. This endpoint needs no permissions, ` +
        "so the service user may be disabled or the company may restrict API access.",
    };
  }
  if (status === 429) {
    return {
      ok: false,
      message: "Bob rate-limited the check (429). That says nothing about the credential — " +
        "retry shortly.",
    };
  }
  return {
    ok: false,
    message: `Bob returned ${status} for ${PROBE_PATH}${suffix}. Not a verdict on the credential.`,
  };
}

const serviceUser: AuthDefinition = {
  key: "service-user",
  type: "basic",
  displayName: "Service user ID & token",
  description:
    "An API service user from Bob (Settings > Integrations > Service users). Its ID and token " +
    "are sent as the HTTP Basic username and password. A new service user can read nothing " +
    "until it is added to a permission group with the features, fields and 'access data for' " +
    "audience the workflow needs.",
  fields: [
    {
      key: "serviceUserId",
      label: "Service user ID",
      type: "secret",
      required: true,
      row: "creds",
      hint: "The ID Bob shows when the service user is created. Used as the Basic username.",
    },
    {
      key: "serviceUserToken",
      label: "Service user token",
      type: "secret",
      required: true,
      row: "creds",
      hint: "The token shown once when the service user is created. Used as the Basic password; " +
        "Bob cannot show it again, so generate a new one if it was not copied.",
    },
  ],

  sign({ request, credential }) {
    request.headers["authorization"] = basicHeader(credential as Partial<HibobCredential>);
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<HibobCredential>;
    const serviceUserId = (cred?.serviceUserId ?? "").trim();
    const serviceUserToken = (cred?.serviceUserToken ?? "").trim();
    if (!serviceUserId || !serviceUserToken) {
      return { ok: false, message: "credential missing serviceUserId or serviceUserToken" };
    }
    const res = await ctx.fetch(`${API_BASE}${V1}${PROBE_PATH}`, {
      headers: {
        accept: "application/json",
        authorization: basicHeader({ serviceUserId, serviceUserToken }),
      },
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text.trim() ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    return classifyProbe(res.status, body);
  },
};

export default serviceUser;
