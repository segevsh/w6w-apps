import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { FORMAT_OUTPUT, FORMAT_SAMPLE } from "../lib/outputs.ts";

interface Input {
  formatId: string;
}

const action: ActionDefinition<Input> = {
  key: "get-format",
  type: "read",
  resource: "format",
  title: "Get Format",
  description: "Retrieve an event format by ID.",
  idempotent: true,
  params: [{ key: "formatId", label: "Format ID", type: "string", required: true }],
  output: [...FORMAT_OUTPUT],
  sample: FORMAT_SAMPLE,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/formats/${encodeURIComponent(input.formatId)}/`);
  },
};

export default action;
