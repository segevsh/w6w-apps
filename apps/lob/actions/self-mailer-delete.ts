import type { ActionDefinition } from "@w6w/types";
import { encodeId, LobClient } from "../lib/client.ts";
import { cancelOutput } from "../lib/params.ts";

interface Input {
  selfMailerId: string;
}

const selfMailerDelete: ActionDefinition<Input> = {
  key: "self-mailer-delete",
  type: "perform",
  resource: "self-mailer",
  title: "Delete Self Mailer",
  description:
    "Delete a self mailer before it goes to production. Lob documents this as possible only when the mailpiece has a send date that has not yet passed; a cancelled piece is not charged. Scheduling and cancellation are a paid-edition feature.",
  idempotent: true,
  params: [{
    key: "selfMailerId",
    label: "Self Mailer ID",
    type: "string",
    required: true,
    placeholder: "sfm_…",
    hint: "Lob ids start with `sfm_`.",
  }],
  output: cancelOutput,

  execute(input, ctx) {
    return new LobClient(ctx).json(`/self_mailers/${encodeId(input.selfMailerId)}`, {
      method: "DELETE",
    });
  },
};

export default selfMailerDelete;
