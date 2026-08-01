import type { AuthDefinition } from "@w6w/types";
import { TRACKING_BASE } from "../lib/client.ts";

/**
 * Source Write Key (`basic`).
 *
 * Segment's Tracking API scheme is HTTP Basic with the source's **Write Key**
 * as the username and an **empty password**: `Authorization: Basic
 * base64("<writeKey>:")` — note the trailing colon with nothing after it.
 * Verified 2026-08-01 against segment.com's HTTP API Source docs and
 * cross-checked against n8n's `SegmentApi.credentials.ts`, which builds the
 * identical header (`Buffer.from(\`${writekey}:\`).toString("base64")`).
 *
 * This is deliberately NOT the same credential as Segment's read-side
 * config/management API (`api.segmentapis.com`), which takes a Bearer token
 * minted in the Segment web app, not a source Write Key. This app only
 * implements the write-side Tracking API, so it only ever needs the Write Key.
 *
 * There is no dedicated "ping"/"whoami" endpoint on the Tracking API — it is
 * write-only. `test` sends the same minimal `identify` call every real client
 * library validation dance sends: a fixed `anonymousId` and empty traits, so
 * repeated connection tests update one harmless anonymous profile rather than
 * minting a new one per check.
 */
const writeKey: AuthDefinition = {
  key: "write-key",
  type: "basic",
  displayName: "Write Key",
  description:
    "Segment Source Settings → API Keys → Write Key. Used as the HTTP Basic username with no password.",
  fields: [
    {
      key: "writeKey",
      label: "Write Key",
      type: "secret",
      required: true,
      hint: "Source Settings → API Keys → Write Key.",
    },
  ],

  sign({ request, credential }) {
    const { writeKey } = credential as { writeKey: string };
    // Empty password: the colon with nothing after it is load-bearing.
    request.headers["authorization"] = `Basic ${btoa(`${writeKey}:`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { writeKey } = credential as { writeKey?: string };
    if (!writeKey) return { ok: false, message: "credential missing writeKey" };
    const res = await ctx.fetch(`${TRACKING_BASE}/identify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${btoa(`${writeKey}:`)}`,
      },
      body: JSON.stringify({ anonymousId: "w6w-connection-test", traits: {} }),
    });
    if (!res.ok) return { ok: false, message: `Segment returned ${res.status}` };
    return { ok: true };
  },
};

export default writeKey;
