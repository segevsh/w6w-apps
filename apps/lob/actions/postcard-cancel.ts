import type { ActionDefinition } from "@w6w/types";
import { encodeId, LobClient } from "../lib/client.ts";
import { cancelOutput } from "../lib/params.ts";

interface Input {
  postcardId: string;
}

const postcardCancel: ActionDefinition<Input> = {
  key: "postcard-cancel",
  type: "perform",
  resource: "postcard",
  title: "Cancel Postcard",
  description:
    "Cancel a postcard before it goes to production. Lob documents this as possible only when the mailpiece has a send date that has not yet passed; a cancelled piece is not charged. Scheduling and cancellation are a paid-edition feature.",
  idempotent: true,
  params: [{
    key: "postcardId",
    label: "Postcard ID",
    type: "string",
    required: true,
    placeholder: "psc_…",
    hint: "Lob ids start with `psc_`.",
  }],
  output: cancelOutput,

  execute(input, ctx) {
    return new LobClient(ctx).json(`/postcards/${encodeId(input.postcardId)}`, {
      method: "DELETE",
    });
  },
};

export default postcardCancel;
