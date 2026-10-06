import type { ActionDefinition } from "@w6w/types";
import { asArray, SynthflowClient } from "../lib/client.ts";

interface Input {
  call_id: string;
}

const callGet: ActionDefinition<Input> = {
  key: "call-get",
  type: "read",
  resource: "call",
  title: "Get Call",
  description: "Read a call's transcript, status and metadata by id.",
  params: [
    { key: "call_id", label: "Call ID", type: "string", required: true },
  ],
  output: [{
    key: "call",
    type: "object",
    label: "Call (transcript, status, duration, recording_url, …)",
  }],

  async execute(input, ctx) {
    const r = await new SynthflowClient(ctx).data<Record<string, unknown>>(
      `/calls/${encodeURIComponent(input.call_id)}`,
    );
    return { call: asArray(r.calls)[0] ?? null };
  },
};

export default callGet;
