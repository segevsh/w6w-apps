import type { ActionDefinition } from "@w6w/types";
import { asStringArray, compact, SimpleTextingClient } from "../lib/client.ts";
import { mediaItemsParam, modeParam } from "../lib/params.ts";

/**
 * `POST /api/messages/evaluate` — "Evaluate a Message".
 *
 * A `POST` that sends nothing: it answers what the same body *would* do —
 * `{detectedCategory, length, remains, maxLength, unicode, sumOfCredits,
 * warnings, errors}`. Declared `type: "read"` for exactly that reason; the verb
 * is an implementation detail of the vendor's API, not a side effect, and
 * nothing is delivered or charged.
 *
 * ## A 201 with `errors` is still a 201
 *
 * The endpoint answers `201` even when the evaluation failed, carrying the
 * reason in `errors` (an array of strings) rather than in the status line. So
 * this action returns the response verbatim and does **not** throw on a
 * non-empty `errors`: "evaluate this and tell me what is wrong with it" is the
 * whole point of the call, and a workflow branching on `errors` cannot do that
 * if the action fails first. The same holds for `warnings`.
 *
 * ## `sumOfCredits` is the number worth branching on
 *
 * The document describes it as "How much credits message will cost" — the
 * per-recipient cost, which is what makes a campaign's total cost predictable:
 * evaluate once, multiply by the audience, and decide before sending.
 *
 * `unicode` is returned verbatim with the document's own wording ("Returns true
 * if there is some number of Latin-1 or GSM-7 characters present"), which is
 * confusing as prose. It is not interpreted here: `maxLength` and `remains` are
 * the fields that already encode the effect of the encoding on what fits.
 */
interface Input {
  mode: string;
  text: string;
  subject?: string;
  fallbackText?: string;
  mediaItems?: string[] | string;
}

const messageEvaluate: ActionDefinition<Input> = {
  key: "message-evaluate",
  type: "read",
  resource: "message",
  title: "Evaluate Message",
  description: "Check what a message body would cost and how it would be sent, without sending it.",
  params: [
    {
      key: "text",
      label: "Text",
      type: "text",
      required: true,
      hint: "The body to evaluate. Nothing is sent; the answer is what a send would have done.",
    },
    modeParam,
    {
      key: "subject",
      label: "Subject",
      type: "string",
      hint: "MMS subject to include in the evaluation.",
    },
    {
      key: "fallbackText",
      label: "MMS fallback text",
      type: "text",
      hint: "Fallback text to include in the evaluation. Must contain [url=%%fallback_link%%].",
    },
    mediaItemsParam,
  ],
  output: [
    { key: "detectedCategory", type: "string", label: "SMS, MMS or EXTENDED_SMS" },
    { key: "length", type: "number", label: "Length in characters" },
    { key: "remains", type: "number", label: "Characters remaining" },
    { key: "maxLength", type: "number", label: "Maximum length for this type and encoding" },
    { key: "unicode", type: "boolean", label: "Vendor's unicode flag" },
    { key: "sumOfCredits", type: "number", label: "Credits this message would cost" },
    { key: "warnings", type: "array", label: "Warnings" },
    { key: "errors", type: "array", label: "Reasons the message would be rejected" },
  ],

  execute(input, ctx) {
    const mediaItems = asStringArray(input.mediaItems);
    return new SimpleTextingClient(ctx).json("/api/messages/evaluate", {
      method: "POST",
      body: compact({
        mode: input.mode,
        text: input.text,
        subject: input.subject,
        fallbackText: input.fallbackText,
        mediaItems,
      }),
    });
  },
};

export default messageEvaluate;
