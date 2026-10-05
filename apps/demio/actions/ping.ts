import type { ActionDefinition } from "@w6w/types";
import { DemioClient } from "../lib/client.ts";

const ping: ActionDefinition<Record<string, never>> = {
  key: "ping",
  type: "read",
  resource: "account",
  title: "Ping",
  description: "Check that the API key and secret work. Returns `pong` (and `sandbox` for a " +
    "sandbox key).",
  params: [],
  output: [
    { key: "pong", type: "boolean", label: "Pong" },
    { key: "sandbox", type: "boolean", label: "Sandbox key" },
  ],

  async execute(_input, ctx) {
    return await new DemioClient(ctx).request<{ pong: boolean; sandbox?: boolean }>("/ping");
  },
};

export default ping;
