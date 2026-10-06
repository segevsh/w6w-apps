import type { ActionDefinition } from "@w6w/types";
import { listOf, numberOf, RingoverClient, seg } from "../lib/client.ts";

interface Input {
  callId: string;
}

const callGet: ActionDefinition<Input> = {
  key: "call-get",
  type: "read",
  resource: "call",
  title: "Get Call",
  description:
    "Fetch the log entries of one terminated call by call ID. A forwarded, transferred or IVR-routed call has several entries.",
  params: [
    { key: "callId", label: "Call ID", type: "string", required: true },
  ],
  output: [
    { key: "calls", type: "array", label: "Call log entries" },
    { key: "count", type: "number", label: "Entries" },
  ],

  async execute(input, ctx) {
    const body = await new RingoverClient(ctx).request("GET", `/calls/${seg(input.callId)}`);
    return { calls: listOf(body, "list"), count: numberOf(body, "list_count") };
  },
};

export default callGet;
