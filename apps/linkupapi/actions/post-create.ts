import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  message?: string;
  file?: string;
  thumbnail?: string;
  documentTitle?: string;
  files?: string;
}

const FIELDS: readonly Field[] = [
  ["message", "message", "s"],
  ["file", "file", "s"],
  ["thumbnail", "thumbnail", "s"],
  ["documentTitle", "document_title", "s"],
  ["files", "files", "m"],
];

const postCreate: ActionDefinition<Input, ActionResult> = {
  key: "post-create",
  type: "perform",
  resource: "content",
  title: "Create Post",
  description: "Publish a post with text and optionally an image, video, document or carousel.",
  idempotent: false,
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint:
        "The LinkupAPI account_id of the connected LinkedIn (or WhatsApp / email) account. List Accounts returns it.",
    },
    { key: "message", label: "Text", type: "text", hint: "Supports #hashtags and line breaks." },
    {
      key: "file",
      label: "File URL",
      type: "string",
      hint: "A public URL of an image, video or document. One file per post.",
    },
    {
      key: "thumbnail",
      label: "Video thumbnail URL",
      type: "string",
      hint: "Cover image; only with a single video file.",
    },
    {
      key: "documentTitle",
      label: "Document title",
      type: "string",
      hint: "Only with a document file.",
    },
    {
      key: "files",
      label: "Carousel file URLs",
      type: "string",
      hint: "Image URLs for a carousel. Several values separated by a semicolon (;).",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "content",
      "create",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default postCreate;
