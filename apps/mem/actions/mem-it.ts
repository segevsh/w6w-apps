import type { ActionDefinition } from "@w6w/types";
import { ack, call, pick } from "../lib/client.ts";
import { str, text, timestampHint } from "../lib/params.ts";

/** `POST /v2/mem-it` (Mem API v2). */
type Input = Record<string, unknown>;

const memIt: ActionDefinition<Input> = {
  key: "mem-it",
  type: "perform",
  resource: "note",
  title: "Mem It",
  description:
    "Hand Mem raw text (a transcript, an email, a web clip) and let it decide what to save and how to organize it. The response is only an acknowledgement; the resulting notes appear asynchronously. Costs 40 complexity tokens of Mem's 200-per-minute budget.",
  idempotent: false,
  params: [
    text("input", "Input", {
      required: true,
      hint: "The content to save, up to 1,000,000 characters.",
    }),
    text("instructions", "Instructions", {
      hint: "How Mem should organize it (up to 10,000 characters).",
    }),
    text("context", "Context", {
      hint: "Background that helps Mem interpret the input (up to 10,000 characters).",
    }),
    str("timestamp", "Timestamp", { hint: timestampHint }),
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Mem accepted the change" },
    { key: "requestId", type: "string", label: "Mem request ID" },
  ],

  execute(input, ctx) {
    return call(ctx, "POST", `/v2/mem-it`, {
      body: pick(input, ["input", "instructions", "context", "timestamp"]),
    }).then(ack);
  },
};

export default memIt;
