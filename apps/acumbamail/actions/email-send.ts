import type { ActionDefinition } from "@w6w/types";
import { call, parseJsonField, required } from "../lib/client.ts";

interface Input {
  from_email: string;
  to_email: string;
  subject: string;
  body?: string;
  template_id?: string;
  merge_tags?: unknown;
  cc_email?: string;
  bcc_email?: string;
  category?: string;
  program_date?: string;
}

/** `POST /api/1/sendOne/` */
const emailSend: ActionDefinition<Input> = {
  key: "email-send",
  type: "perform",
  title: "Send Transactional Email",
  description:
    "Send one transactional email, with either an HTML body or a template. Not safe to retry (each call sends a message).",
  idempotent: false,
  params: [
    {
      key: "from_email",
      label: "From email",
      type: "string",
      required: true,
    },
    {
      key: "to_email",
      label: "To email",
      type: "string",
      required: true,
    },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      required: true,
    },
    {
      key: "body",
      label: "HTML body",
      type: "text",
      hint: "Send this or Template ID.",
    },
    {
      key: "template_id",
      label: "Template ID",
      type: "string",
      hint: "Send this or HTML body.",
    },
    {
      key: "merge_tags",
      label: "Merge tags",
      type: "json",
      hint: "With a template: object of tag -> value for this send.",
    },
    {
      key: "cc_email",
      label: "CC",
      type: "string",
    },
    {
      key: "bcc_email",
      label: "BCC",
      type: "string",
    },
    {
      key: "category",
      label: "Category",
      type: "string",
    },
    {
      key: "program_date",
      label: "Schedule date",
      type: "string",
      hint: "Send later; the reference says DD//MM/YYYY HH:MM (sic).",
    },
  ],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(input, ctx) {
    const result = await call(ctx, "sendOne", {
      from_email: required("from_email", input.from_email),
      to_email: required("to_email", input.to_email),
      subject: required("subject", input.subject),
      body: input.body,
      template_id: input.template_id,
      merge_tags: parseJsonField("merge_tags", input.merge_tags),
      cc_email: input.cc_email,
      bcc_email: input.bcc_email,
      category: input.category,
      program_date: input.program_date,
    });
    return { result };
  },
};

export default emailSend;
