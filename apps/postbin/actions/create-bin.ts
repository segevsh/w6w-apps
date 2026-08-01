import type { ActionDefinition } from "@w6w/types";
import { API_BASE, type Bin, postbinRequest } from "../lib/client.ts";

interface Output extends Bin {
  /** The URL to send test requests to — collected requests show up in this bin. */
  requestUrl: string;
}

/**
 * POST /api/bin — creates a new bin. Every request sent to
 * `https://www.postb.in/<binId>` for the next ~30 minutes is captured and can
 * be read back with Get Request / Shift Request. Not idempotent: every call
 * mints a brand new bin.
 */
const createBin: ActionDefinition<Record<string, never>, Output> = {
  key: "create-bin",
  type: "perform",
  resource: "bin",
  title: "Create Bin",
  description: "Create a new PostBin bin that collects any request sent to it for ~30 minutes.",
  idempotent: false,
  params: [],
  output: [
    { key: "binId", type: "string", label: "Bin ID" },
    { key: "now", type: "number", label: "Created at (ms epoch)" },
    { key: "expires", type: "number", label: "Expires at (ms epoch)" },
    { key: "requestUrl", type: "string", label: "URL to send test requests to" },
  ],

  async execute(_input, ctx) {
    const bin = await postbinRequest<Bin>(ctx, "/api/bin", { method: "POST" });
    return { ...bin, requestUrl: `${API_BASE}/${bin.binId}` };
  },
};

export default createBin;
