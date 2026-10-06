import type { AuthDefinition } from "@w6w/types";
import { apiBase, type Region } from "../lib/client.ts";

/**
 * Iterable API key — `Api-Key: <key>` request header.
 *
 * Verified 2026-10-06 against Iterable's Swagger document
 * (`securityDefinitions.api_key: {type: apiKey, in: header, name: Api-Key}`)
 * and live against both data centers.
 *
 * ## Region
 *
 * Iterable runs two separate data centers (US `api.iterable.com`, EU
 * `api.eu.iterable.com`); a project and its keys live in exactly one. The
 * `region` field travels with the credential so `test` probes the right host
 * and is echoed onto the connection's `display` by `afterConnect`, so actions
 * can choose a host without seeing the credential. Only those two hosts are
 * ever contacted.
 *
 * ## Key types
 *
 * Iterable issues Server-side, Mobile and JavaScript keys. This app calls
 * server-side endpoints, so it needs a **server-side** key. The probe below
 * is a project-level read that a server-side key can always make.
 *
 * ## Probe: `GET /api/channels`
 *
 *  - It requires a key: unsigned it answers `401 {"code":"Unauthorized",
 *    "msg":"No API key found on request"}`, a fake key answers
 *    `401 {"code":"Unauthorized","msg":"Invalid API key"}` (both measured live).
 *  - It returns project metadata (`{channels: [{id, name, channelType,
 *    messageMedium}]}`) — nothing about the key itself, so the response never
 *    echoes the credential. Iterable has no whoami endpoint.
 *  - It writes nothing and is documented at 100 req/s per project.
 *
 * The verdict is read from the body, never the status alone: success needs
 * the documented `channels` array, rejection is the vendor's own `code`
 * (`Unauthorized` / `BadApiKey`).
 */
export interface IterableCredential {
  apiKey: string;
  region?: Region | string;
}

const API_KEY_HEADER = "api-key";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "A server-side API key from Iterable > Integrations > API Keys.",
  connectionLabel: "Iterable ({{region}})",
  apiKey: { in: "header", name: "Api-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Iterable > Integrations > API Keys. Create a Server-side key for this connection.",
    },
    {
      key: "region",
      label: "Data center",
      type: "select",
      required: true,
      default: "us",
      hint: "Where your Iterable project lives. A key only works on its own data center.",
      options: [
        { value: "us", label: "US (api.iterable.com)" },
        { value: "eu", label: "EU (api.eu.iterable.com)" },
      ],
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as unknown as IterableCredential;
    request.headers[API_KEY_HEADER] = apiKey;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey, region } = credential as unknown as Partial<IterableCredential>;
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`${apiBase(region === "eu" ? "eu" : "us")}/channels`, {
      method: "GET",
      headers: { [API_KEY_HEADER]: apiKey, accept: "application/json" },
    });
    const body = await res.json().catch(() => undefined) as
      | { code?: string; msg?: string; channels?: unknown }
      | undefined;
    if (res.ok && Array.isArray(body?.channels)) return { ok: true };
    if (body?.code === "Unauthorized" || body?.code === "BadApiKey") {
      return {
        ok: false,
        message: `Iterable rejected the API key (${body.msg ?? body.code}). ` +
          "Check the key and that the data center matches the project's.",
      };
    }
    if (body?.code) {
      return {
        ok: false,
        message: `Iterable ${res.status}: ${body.code} ${body.msg ?? ""}`.trim(),
      };
    }
    return { ok: false, message: `Unexpected response from Iterable (HTTP ${res.status})` };
  },

  /** Echo the region onto the connection so actions can pick a host. */
  afterConnect({ credential }) {
    const { region } = credential as unknown as Partial<IterableCredential>;
    return { region: region === "eu" ? "eu" : "us" };
  },
};

export default apiKey;
