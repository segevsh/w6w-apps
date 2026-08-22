import type { AuthDefinition } from "@w6w/types";
import { apiUrl, type Region, REGIONS } from "../lib/client.ts";

/**
 * API key in the `x-api-key` header — what the spec's only security scheme
 * declares (`type: apiKey`, `in: header`, `name: x-api-key`), and what the live
 * host expects.
 *
 * ## Two 401s that are not both 401s
 *
 * Measured 2026-08-18 against `console.jumpcloud.com`:
 *
 *   GET /api/systemusers  (wrong key) -> 401
 *       {"error":"Unauthorized","message":"Unauthorized: api key user not found"}
 *   GET /api/systemusers  (NO key)    -> 302, location: /login
 *
 * The second is the trap. Following that redirect lands on a `200 text/html`
 * login page, so a client with default redirect handling sees success. `test`
 * therefore treats a 3xx as an auth failure and says which of the two happened,
 * because "the key is wrong" and "the key never arrived" have different fixes.
 *
 * ## The region is part of the credential
 *
 * JumpCloud runs three consoles — US, EU and India — and a key issued in one is
 * not valid in another. There is no discovery endpoint for which one a key
 * belongs to, and a key from the wrong console fails as an ordinary 401, so the
 * region is asked for rather than guessed. `test` probes the chosen region,
 * which is what makes a mismatch visible at connect time instead of at 3am.
 *
 * ## `x-org-id` and the multi-tenant trap
 *
 * An MSP admin's key can see several organizations. Without `x-org-id` on the
 * request, JumpCloud acts on the key's **default** organization — which is a
 * real organization, so the call succeeds and changes the wrong tenant. The
 * field is optional (a single-org account has nothing to choose) but is set
 * once here rather than per action, so it cannot be forgotten on one of them.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "An API key from JumpCloud → your user menu → My API Key. Sent as the `x-api-key` header.",
  connectionLabel: "{{orgName}} ({{region}})",
  apiKey: { in: "header", name: "x-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "JumpCloud console → your user menu (top right) → My API Key.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "us",
      options: [
        { value: "us", label: "United States (console.jumpcloud.com)" },
        { value: "eu", label: "European Union (console.eu.jumpcloud.com)" },
        { value: "in", label: "India (console.in.jumpcloud.com)" },
      ],
      hint: "A key issued in one console does not work against another.",
    },
    {
      key: "orgId",
      label: "Organization ID",
      type: "string",
      default: "",
      hint: "Multi-tenant (MSP) accounts only. Blank means the key's DEFAULT organization — " +
        "which is a real one, so leaving it blank on an MSP key acts on the wrong tenant " +
        "rather than failing.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey, orgId } = credential as { apiKey: string; orgId?: string };
    request.headers["x-api-key"] = apiKey;
    if (orgId?.trim()) request.headers["x-org-id"] = orgId.trim();
    return request;
  },

  /**
   * `GET /api/systemusers?limit=1` is the narrowest call that proves the key
   * works **in the chosen region** — the cheapest read on the resource this app
   * is mostly about.
   */
  async test({ credential }, ctx) {
    const { apiKey, region, orgId } = credential as {
      apiKey?: string;
      region?: Region;
      orgId?: string;
    };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const host = REGIONS[(region ?? "us") as Region] ?? REGIONS.us;

    const headers: Record<string, string> = { "x-api-key": apiKey, accept: "application/json" };
    if (orgId?.trim()) headers["x-org-id"] = orgId.trim();

    const res = await ctx.fetch(`https://${host}/api/systemusers?limit=1`, {
      headers,
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      return {
        ok: false,
        message:
          `JumpCloud redirected to the login page (${res.status}) — the api key did not reach ` +
          "the API at all",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `JumpCloud rejected the api key in the ${region ?? "us"} region (401)`,
      };
    }
    if (res.status === 403) {
      return { ok: false, message: "the api key is valid but not permitted to read users (403)" };
    }
    if (!res.ok) return { ok: false, message: `JumpCloud returned ${res.status}` };
    return { ok: true };
  },

  /** Publishes the region and organization the actions build calls from. */
  async afterConnect(_input, ctx) {
    const { credential } = _input as {
      credential: { apiKey?: string; region?: Region; orgId?: string };
    };
    const region = (credential.region ?? "us") as Region;
    const display: Record<string, unknown> = {
      region,
      orgId: credential.orgId?.trim() || undefined,
    };
    if (!credential.apiKey) return display;

    try {
      const headers: Record<string, string> = {
        "x-api-key": credential.apiKey,
        accept: "application/json",
      };
      if (credential.orgId?.trim()) headers["x-org-id"] = credential.orgId.trim();
      const res = await ctx.fetch(`${apiUrl(region)}/organizations?limit=1`, {
        headers,
        redirect: "manual",
      });
      if (!res.ok) return display;
      const body = await res.json() as { results?: Array<{ _id?: string; displayName?: string }> };
      const org = body.results?.[0];
      // Naming the organization is the whole point: on an MSP key it is how you
      // see, at a glance, which tenant this connection is pointed at.
      display.orgName = org?.displayName;
      display.orgId = credential.orgId?.trim() || org?._id;
      return display;
    } catch {
      return display;
    }
  },
};

export default apiKey;
