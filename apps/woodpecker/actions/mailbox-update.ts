import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, V2 } from "../lib/client.ts";
import { str, text } from "../lib/params.ts";

type Input = {
  mailbox_id: string;
  footer: string;
};

const mailboxUpdate: ActionDefinition<Input> = {
  key: "mailbox-update",
  type: "perform",
  resource: "mailbox",
  title: "Update Mailbox Footer",
  description: "Set or clear the HTML footer of an SMTP mailbox.",
  idempotent: true,
  params: [
    str("mailbox_id", "SMTP mailbox ID", {
      required: true,
      hint: "The SMTP ID from List Mailboxes (not the IMAP ID).",
    }),
    text("footer", "Footer (HTML)", {
      required: true,
      hint:
        "HTML footer; supports the {{UNSUBSCRIBE}} snippet wrapped in an <a href>. Send an empty string to remove it.",
    }),
  ],
  output: [
    { key: "updated", type: "boolean", label: "True when accepted" },
    { key: "mailbox_id", type: "string", label: "Mailbox ID" },
  ],

  async execute(input, ctx) {
    await call(ctx, "PATCH", V2, `/mailboxes/${encodeId(input.mailbox_id)}`, {
      body: { footer: input.footer ?? "" },
    });
    return { updated: true, mailbox_id: input.mailbox_id };
  },
};

export default mailboxUpdate;
