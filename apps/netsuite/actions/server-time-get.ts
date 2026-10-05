import type { ActionDefinition } from "@w6w/types";
import { NetSuiteClient } from "../lib/client.ts";
import { PROBE_PATH } from "../lib/probe.ts";

/**
 * `GET /services/rest/system/v1/serverTime` — NetSuite's UTC clock, `{"serverTime": "…Z"}`.
 * Oracle: "There are no explicit permissions for this operation". Use it to seed a sync
 * checkpoint independent of the workflow host's clock.
 */
const serverTimeGet: ActionDefinition<Record<string, never>> = {
  key: "server-time-get",
  type: "read",
  resource: "system",
  title: "Get Server Time",
  description: "Read NetSuite's server time (UTC) — a clock to anchor incremental syncs on.",
  params: [],
  output: [{ key: "serverTime", type: "string", label: "NetSuite server time (UTC)" }],

  async execute(_input, ctx) {
    const res = await new NetSuiteClient(ctx).request(PROBE_PATH);
    return { serverTime: res.data?.serverTime ?? null };
  },
};

export default serverTimeGet;
