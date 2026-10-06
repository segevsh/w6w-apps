import type { AuthDefinition } from "@w6w/types";
import { API_BASE, buildUrl, errorMessage } from "../lib/client.ts";

/**
 * Metricool user token: `X-Mc-Auth: <userToken>` plus the account's `userId` query parameter.
 *
 * The vendor's intro says every call carries `userToken`, `userId` and `blogId`, and that the
 * token is the only one of them accepted in a header. The token and the `userId` are the
 * Connection's; the brand (`blogId`) is an Action parameter. `sign` therefore stamps the header
 * and *sets* `userId` through `URLSearchParams`, so it merges with whatever query the action
 * built instead of doubling a `?`.
 *
 * ## The probe
 *
 * `GET /v2/settings/brands`: it needs the credential, returns the account's brands (names, ids,
 * network handles; never the token) and is the call every workflow starts with. The gateway
 * answers 401 for *any* path, so an unauthenticated 401 proves nothing about the route; the
 * success is therefore the documented `{data: [...]}` envelope with an array, and the failure is
 * read from the vendor's `{status: "UNAUTHORIZED", code, title, detail}` body, never from the
 * status line alone.
 */
export const PROBE_PATH = "/v2/settings/brands";

export interface MetricoolCredential {
  userToken: string;
  userId: string | number;
}

export function authHeaders(credential: Partial<MetricoolCredential>): Record<string, string> {
  return { "x-mc-auth": String(credential.userToken ?? "").trim() };
}

/** Stamp the credential onto a request: header for the token, query for the user id. */
export function stamp<R extends { url: string; headers: Record<string, string> }>(
  request: R,
  credential: Partial<MetricoolCredential>,
): R {
  Object.assign(request.headers, authHeaders(credential));
  const url = new URL(request.url);
  url.searchParams.set("userId", String(credential.userId ?? "").trim());
  request.url = url.toString();
  return request;
}

interface Failure {
  status?: unknown;
  code?: unknown;
}

const userToken: AuthDefinition = {
  key: "user-token",
  type: "apiKey",
  displayName: "User token",
  description: "Your Metricool API user token and numeric user id (Account settings > API).",
  connectionLabel: "Metricool",
  apiKey: { in: "header", name: "X-Mc-Auth" },
  fields: [
    {
      key: "userToken",
      label: "User token",
      type: "secret",
      required: true,
      hint: "Metricool > Account settings > API. API access needs a plan that includes it.",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: "The numeric user id of your Metricool account (the `userId` shown next to the token).",
    },
  ],

  sign({ request, credential }) {
    return stamp(request, credential as Partial<MetricoolCredential>);
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<MetricoolCredential>;
    if (!String(cred?.userToken ?? "").trim()) {
      return { ok: false, message: "credential missing userToken" };
    }
    if (!String(cred?.userId ?? "").trim()) {
      return { ok: false, message: "credential missing userId" };
    }

    const request = stamp(
      { url: buildUrl(PROBE_PATH), headers: { accept: "application/json" } },
      cred,
    );
    const res = await ctx.fetch(request.url, { headers: request.headers });
    const body = await res.json().catch(() => null) as { data?: unknown } & Failure | null;

    if (res.ok && Array.isArray(body?.data)) return { ok: true };

    const rejected = String(body?.status ?? "").toUpperCase() === "UNAUTHORIZED" ||
      String(body?.code ?? "") === "401";
    if (rejected) {
      return {
        ok: false,
        message: "Metricool rejected the user token or user id. Copy both from Account settings " +
          "> API and reconnect.",
      };
    }
    const vendor = errorMessage(body);
    return {
      ok: false,
      message: `Metricool returned HTTP ${res.status} for ${API_BASE}${PROBE_PATH}` +
        `${vendor ? `: ${vendor}` : ""}`,
    };
  },
};

export default userToken;
