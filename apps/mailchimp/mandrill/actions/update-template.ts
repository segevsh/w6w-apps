import type { ActionDefinition } from "@w6w/types";
import { MandrillClient } from "../lib/client.ts";

interface Input {
  name: string;
  fromEmail?: string;
  fromName?: string;
  subject?: string;
  code?: string;
  text?: string;
  publish?: boolean;
  labels?: string[] | string;
}

const updateTemplate: ActionDefinition<Input> = {
  key: "update-template",
  type: "perform",
  resource: "template",
  title: "Update Template",
  description:
    "Update the code and metadata for an existing template (POST /templates/update.json).",
  idempotent: true,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "fromEmail", label: "Default From Email", type: "string" },
    { key: "fromName", label: "Default From Name", type: "string" },
    { key: "subject", label: "Default Subject", type: "string" },
    { key: "code", label: "HTML Code", type: "text" },
    { key: "text", label: "Text Part", type: "text" },
    { key: "publish", label: "Publish immediately", type: "boolean" },
    { key: "labels", label: "Labels", type: "string", hint: "Comma-separated list or JSON array." },
  ],
  output: [
    { key: "slug", type: "string", label: "Slug" },
    { key: "name", type: "string", label: "Name" },
    { key: "labels", type: "array", label: "Labels" },
    { key: "publish_name", type: "string", label: "Published Name" },
    { key: "published_at", type: "string", label: "Published At" },
    { key: "created_at", type: "string", label: "Created At" },
    { key: "updated_at", type: "string", label: "Updated At" },
  ],

  execute(input, ctx) {
    const client = new MandrillClient(ctx);
    const labels = input.labels
      ? Array.isArray(input.labels)
        ? input.labels
        : input.labels.split(",").map((l) => l.trim()).filter(Boolean)
      : undefined;
    return client.request("/templates/update.json", {
      name: input.name,
      from_email: input.fromEmail,
      from_name: input.fromName,
      subject: input.subject,
      code: input.code,
      text: input.text,
      publish: input.publish,
      labels,
    });
  },
};

export default updateTemplate;
