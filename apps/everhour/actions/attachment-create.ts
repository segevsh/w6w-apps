import type { ActionDefinition } from "@w6w/types";
import { compact, EverhourClient } from "../lib/client.ts";

/**
 * `POST /attachments` — Upload an attachment (base64) to attach to an expense or time off.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  name: string;
  content: string;
}

const attachmentCreate: ActionDefinition<Input> = {
  key: "attachment-create",
  type: "perform",
  resource: "attachment",
  title: "Create Attachment",
  description: "Upload an attachment (base64) to attach to an expense or time off.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "File name",
      type: "string",
      required: true,
      hint: "e.g. `receipt.png`.",
    },
    {
      key: "content",
      label: "Content (base64)",
      type: "text",
      required: true,
      hint: "Base64 file content. Only jpg, png and pdf are supported.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Attachment ID" },
    { key: "name", type: "string", label: "File name" },
    { key: "token", type: "string", label: "Download token" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/attachments`, {
      method: "POST",
      body: compact({ name: input.name, content: input.content }),
    });
  },
};

export default attachmentCreate;
