import type { ActionDefinition } from "@w6w/types";
import { parseComponents, WhatsAppClient } from "../lib/client.ts";
import { messageOutput, to } from "../lib/params.ts";

interface Input {
  to: string;
  templateName: string;
  languageCode: string;
  components?: unknown;
}

/**
 * The only message type deliverable **outside** the 24-hour customer service
 * window — the reason templates exist at all. `name` + `language` must match
 * a template already approved for this WABA (`template-get-many` lists them);
 * Meta rejects an unapproved or misspelled name/language pair with a 4xx.
 *
 * `components` is passed through close to verbatim — it is the Cloud API's
 * own `template.components` array (body/header/button parameters), which is
 * expressive enough that re-deriving a friendlier form here would just be a
 * lossy re-encoding of what Meta's own template editor already produces.
 */
const messageSendTemplate: ActionDefinition<Input> = {
  key: "message-send-template",
  type: "perform",
  resource: "message",
  title: "Send Template Message",
  description:
    "Send a pre-approved message template. Works even outside the 24-hour customer service window.",
  idempotent: false,
  params: [
    to,
    {
      key: "templateName",
      label: "Template name",
      type: "string",
      required: true,
      hint: "The template's `name`, as shown by Get Many Templates or Meta's Template Manager.",
    },
    {
      key: "languageCode",
      label: "Language code",
      type: "string",
      required: true,
      default: "en_US",
      hint: "The template's approved language/locale code, e.g. en_US.",
    },
    {
      key: "components",
      label: "Components",
      type: "json",
      hint: "Cloud API `template.components` array, e.g. " +
        '[{ "type": "body", "parameters": [{ "type": "text", "text": "Ada" }] }].',
    },
  ],
  output: messageOutput,

  execute(input, ctx) {
    return new WhatsAppClient(ctx).sendMessage({
      to: input.to,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode },
        components: parseComponents(input.components),
      },
    });
  },
};

export default messageSendTemplate;
