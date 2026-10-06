import type { ActionDefinition } from "@w6w/types";
import { compact, MixmaxClient, seg, strList } from "../lib/client.ts";

interface Input {
  sequenceId: string;
  emails?: string;
}

const sequenceCancel: ActionDefinition<Input> = {
  key: "sequence-cancel",
  type: "perform",
  resource: "sequence",
  title: "Cancel Sequence",
  description: "Exit all active recipients from a sequence, or only the listed email addresses.",
  idempotent: true,
  params: [
    {
      key: "sequenceId",
      label: "Sequence ID",
      type: "string",
      required: true,
      hint: "The sequence to cancel.",
    },
    {
      key: "emails",
      label: "Emails",
      type: "string",
      hint: "Comma-separated emails to exit. Omit to exit every active recipient.",
    },
  ],
  output: [{ key: "cancelled", type: "boolean", label: "Cancelled" }],

  async execute(input, ctx) {
    await new MixmaxClient(ctx).request("POST", `/sequences/${seg(input.sequenceId)}/cancel`, {
      body: compact({ emails: strList(input.emails) }),
    });
    return { cancelled: true };
  },
};

export default sequenceCancel;
