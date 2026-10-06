import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, V2 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

type Input = {
  mailbox_id: string;
};

const mailboxGet: ActionDefinition<Input> = {
  key: "mailbox-get",
  type: "read",
  resource: "mailbox",
  title: "Get Mailbox",
  description: "Fetch one SMTP or IMAP mailbox by its ID.",
  params: [
    str("mailbox_id", "Mailbox ID", {
      required: true,
      hint: "SMTP or IMAP ID from List Mailboxes.",
    }),
  ],
  output: [
    { key: "id", type: "number", label: "Mailbox ID" },
    { key: "type", type: "string", label: "SMTP or IMAP" },
    {
      key: "details",
      type: "object",
      label: "Email, provider, limits, warm-up and reconnect state",
    },
  ],

  async execute(input, ctx) {
    return (await call(ctx, "GET", V2, `/mailboxes/${encodeId(input.mailbox_id)}`)) as Record<
      string,
      unknown
    >;
  },
};

export default mailboxGet;
