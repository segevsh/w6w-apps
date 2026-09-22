import type { ActionDefinition } from "@w6w/types";
import { asStringArray, compact, SimpleTextingClient } from "../lib/client.ts";
import { accountPhoneParam, contactPhoneParam, mediaItemsParam, modeParam } from "../lib/params.ts";

/**
 * `POST /api/messages` — "Send a Message".
 *
 * Answers `201` with `{id, credits}`: the hexadecimal message ID, and the
 * credits the send actually consumed. The schema's own note on `credits` is
 * "Actual credits amount. Can be negative" — a negative value is a refund, not
 * an error, so it is returned as the vendor sent it.
 *
 * ## Not idempotent, and there is no key to make it so
 *
 * The document declares no idempotency key on this endpoint, and a retry is not
 * a retry of a request: it is a second SMS delivered to a real person's phone
 * and a second charge against the account's credits. `idempotent: false` is
 * therefore the honest declaration, and it matters — the action returns the
 * message ID *after* the send has happened, so a run that fails on the way back
 * has already texted someone, and there is no vendor-side key to ask "did my
 * earlier attempt land?".
 *
 * ## Evaluate first when the message is not a fixed string
 *
 * `message-evaluate` costs nothing and answers the same questions a caller
 * usually has before spending a credit: which category the text will be sent
 * as, how many characters fit, and whether anything in it will be rejected.
 * That is the right place to validate a templated body; this action assumes the
 * body is already fit to send.
 *
 * ## The fallback link placeholder
 *
 * `fallbackText` is used when a contact's carrier cannot receive an MMS, and
 * the document requires it to carry the literal placeholder
 * `[url=%%fallback_link%%]` — the vendor substitutes a link to the hosted
 * message there. A fallback without it is accepted by the API and delivers text
 * with no way for the contact to read the message, so the hint says so.
 */
interface Input {
  contactPhone: string;
  mode: string;
  text: string;
  accountPhone?: string;
  subject?: string;
  fallbackText?: string;
  mediaItems?: string[] | string;
}

const messageSend: ActionDefinition<Input> = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send one SMS or MMS to a contact's phone number.",
  idempotent: false,
  params: [
    contactPhoneParam,
    {
      key: "text",
      label: "Text",
      type: "text",
      required: true,
      hint: "The message body. Use Evaluate Message to see how many credits it will cost before " +
        "sending it to a list.",
    },
    modeParam,
    accountPhoneParam,
    {
      key: "subject",
      label: "Subject",
      type: "string",
      hint: "MMS subject. Only sent for MMS; ignored for a plain SMS.",
    },
    {
      key: "fallbackText",
      label: "MMS fallback text",
      type: "text",
      hint: "Sent when the contact's carrier cannot receive an MMS. Must contain " +
        "[url=%%fallback_link%%] — that is what the vendor replaces with a link to the message.",
    },
    mediaItemsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Message ID (hexadecimal)" },
    { key: "credits", type: "number", label: "Credits used — negative means refunded" },
  ],

  execute(input, ctx) {
    const mediaItems = asStringArray(input.mediaItems);
    ctx.log("info", "sending a SimpleTexting message", {
      mode: input.mode,
      withMedia: mediaItems !== undefined,
    });

    return new SimpleTextingClient(ctx).json("/api/messages", {
      method: "POST",
      body: compact({
        contactPhone: input.contactPhone,
        mode: input.mode,
        text: input.text,
        accountPhone: input.accountPhone,
        subject: input.subject,
        fallbackText: input.fallbackText,
        mediaItems,
      }),
    });
  },
};

export default messageSend;
