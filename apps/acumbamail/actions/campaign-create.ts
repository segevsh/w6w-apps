import type { ActionDefinition } from "@w6w/types";
import { call, parseJsonField, required } from "../lib/client.ts";

interface Input {
  name: string;
  from_name: string;
  from_email: string;
  subject: string;
  content: string;
  lists: unknown;
  date_send?: string;
  tracking_urls?: boolean;
  complete_json?: boolean;
  https?: boolean;
}

/** `POST /api/1/createCampaign/` */
const campaignCreate: ActionDefinition<Input> = {
  key: "campaign-create",
  type: "perform",
  title: "Create and Send Campaign",
  description:
    "Create a campaign and send it (immediately, or at Send date when scheduled). Returns the campaign ID, or the vendor error text if it could not be sent. Not safe to retry.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Campaign name",
      type: "string",
      required: true,
      hint: "Internal name (not public).",
    },
    {
      key: "from_name",
      label: "From name",
      type: "string",
      required: true,
    },
    {
      key: "from_email",
      label: "From email",
      type: "string",
      required: true,
      hint: 'Address; "Name <email@domain.com>" is accepted.',
    },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      required: true,
    },
    {
      key: "content",
      label: "HTML content",
      type: "text",
      required: true,
      hint: "The HTML of the campaign.",
    },
    {
      key: "lists",
      label: "Lists",
      type: "json",
      required: true,
      hint:
        'Identifiers of the lists to send to, as an array [7, 9] (or an object); a segment is its ID prefixed with "s". Not more than one segment of a list, nor a segment and its own list. Encoded as lists[0]=7&lists[1]=9.',
    },
    {
      key: "date_send",
      label: "Send date",
      type: "string",
      hint: "Optional, YYYY-MM-DD HH:MM; only for scheduled campaigns.",
    },
    {
      key: "tracking_urls",
      label: "Track link clicks",
      type: "boolean",
      hint: "Replace links for click tracking (vendor default on).",
    },
    {
      key: "complete_json",
      label: "Complete JSON",
      type: "boolean",
      hint: "Return the complete format.",
    },
    {
      key: "https",
      label: "HTTPS tracking links",
      type: "boolean",
      hint: "Needs an A record pointing to 185.2.150.182 (vendor note).",
    },
  ],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(input, ctx) {
    const result = await call(ctx, "createCampaign", {
      name: required("name", input.name),
      from_name: required("from_name", input.from_name),
      from_email: required("from_email", input.from_email),
      subject: required("subject", input.subject),
      content: required("content", input.content),
      lists: parseJsonField("lists", input.lists),
      date_send: input.date_send,
      tracking_urls: input.tracking_urls,
      complete_json: input.complete_json,
      https: input.https,
    });
    return { result };
  },
};

export default campaignCreate;
