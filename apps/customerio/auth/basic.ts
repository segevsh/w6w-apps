import type { AuthDefinition } from "@w6w/types";
import { trackBase } from "../lib/client.ts";

/**
 * Site ID + Track API Key (`basic`).
 *
 * Customer.io's Track API scheme is HTTP Basic with the workspace's **Site
 * ID** as the username and its **Track API Key** as the password:
 * `Authorization: Basic base64("<siteId>:<apiKey>")`. Verified 2026-08-01
 * against the official `customerio-node` SDK (`lib/request.ts`:
 * `Buffer.from(\`${siteid}:${apikey}\`, 'utf8').toString('base64')`) and
 * cross-checked against n8n's `CustomerIoApi.credentials.ts`, which builds
 * the identical header for `track.customer.io` / `track-eu.customer.io`.
 *
 * This is deliberately NOT the same credential as Customer.io's **App API**
 * (`api.customer.io` / `api-eu.customer.io`), which takes a Bearer token
 * (a separate "App API Key") used for campaigns, broadcasts and workspace
 * management. This app only implements the write-side Track API, so it only
 * ever needs the Site ID + Track API Key pair.
 *
 * `region` selects which of Customer.io's two, entirely separate regional
 * deployments the workspace lives in — see `../lib/client.ts`. It travels
 * with the credential (so `test` can probe the right host at connect time)
 * and is also echoed onto the connection's `display` by `afterConnect`, the
 * same pattern Zendesk's subdomain and Mailgun's region field use, so every
 * action can read it without ever seeing the credential.
 *
 * There is no dedicated ping/whoami endpoint on the Track API — it is
 * write-only. `test` sends the same minimal `identify` PUT every real
 * integration's validation dance sends: a fixed, harmless test person ID with
 * no attributes, so repeated connection tests update one profile rather than
 * minting a new one per check.
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Site ID & Track API Key",
  description:
    "Workspace Settings → API Credentials → Track API Keys. Used as HTTP Basic username/password.",
  connectionLabel: "Customer.io ({{region}})",
  fields: [
    {
      key: "siteId",
      label: "Site ID",
      type: "string",
      required: true,
      row: "creds",
      hint: "Workspace Settings → API Credentials → Track API Keys → Site ID.",
    },
    {
      key: "apiKey",
      label: "Track API Key",
      type: "secret",
      required: true,
      row: "creds",
      hint: "Workspace Settings → API Credentials → Track API Keys → API Key.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "us",
      hint: "Where the workspace was created. Customer.io serves US and EU from separate hosts.",
      options: [
        { value: "us", label: "US (track.customer.io)" },
        { value: "eu", label: "EU (track-eu.customer.io)" },
      ],
    },
  ],

  sign({ request, credential }) {
    const { siteId, apiKey } = credential as { siteId: string; apiKey: string };
    request.headers["authorization"] = `Basic ${btoa(`${siteId}:${apiKey}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { siteId, apiKey, region } = credential as {
      siteId?: string;
      apiKey?: string;
      region?: string;
    };
    if (!siteId || !apiKey) return { ok: false, message: "credential missing siteId or apiKey" };
    const base = trackBase(region === "eu" ? "eu" : "us");
    const res = await ctx.fetch(`${base}/customers/w6w-connection-test`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${btoa(`${siteId}:${apiKey}`)}`,
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) return { ok: false, message: `Customer.io returned ${res.status}` };
    return { ok: true };
  },

  /** Records the region on the connection so actions can pick a host without ever seeing the credential. */
  afterConnect({ credential }) {
    const { region } = credential as { region?: string };
    return { region: region === "eu" ? "eu" : "us" };
  },
};

export default basic;
