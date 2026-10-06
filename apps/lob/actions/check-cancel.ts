import type { ActionDefinition } from "@w6w/types";
import { encodeId, LobClient } from "../lib/client.ts";
import { cancelOutput } from "../lib/params.ts";

interface Input {
  checkId: string;
}

const checkCancel: ActionDefinition<Input> = {
  key: "check-cancel",
  type: "perform",
  resource: "check",
  title: "Cancel Check",
  description:
    "Cancel a check before it goes to production. Lob documents this as possible only when the mailpiece has a send date that has not yet passed; a cancelled piece is not charged. Scheduling and cancellation are a paid-edition feature.",
  idempotent: true,
  params: [{
    key: "checkId",
    label: "Check ID",
    type: "string",
    required: true,
    placeholder: "chk_…",
    hint: "Lob ids start with `chk_`.",
  }],
  output: cancelOutput,

  execute(input, ctx) {
    return new LobClient(ctx).json(`/checks/${encodeId(input.checkId)}`, { method: "DELETE" });
  },
};

export default checkCancel;
