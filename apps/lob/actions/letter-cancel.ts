import type { ActionDefinition } from "@w6w/types";
import { encodeId, LobClient } from "../lib/client.ts";
import { cancelOutput } from "../lib/params.ts";

interface Input {
  letterId: string;
}

const letterCancel: ActionDefinition<Input> = {
  key: "letter-cancel",
  type: "perform",
  resource: "letter",
  title: "Cancel Letter",
  description:
    "Cancel a letter before it goes to production. Lob documents this as possible only when the mailpiece has a send date that has not yet passed; a cancelled piece is not charged. Scheduling and cancellation are a paid-edition feature.",
  idempotent: true,
  params: [{
    key: "letterId",
    label: "Letter ID",
    type: "string",
    required: true,
    placeholder: "ltr_…",
    hint: "Lob ids start with `ltr_`.",
  }],
  output: cancelOutput,

  execute(input, ctx) {
    return new LobClient(ctx).json(`/letters/${encodeId(input.letterId)}`, { method: "DELETE" });
  },
};

export default letterCancel;
