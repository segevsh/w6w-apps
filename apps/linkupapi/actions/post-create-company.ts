import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  companyUrl: string;
  message?: string;
  file?: string;
  thumbnail?: string;
  files?: string;
}

const FIELDS: readonly Field[] = [
  ["companyUrl", "company_url", "s"],
  ["message", "message", "s"],
  ["file", "file", "s"],
  ["thumbnail", "thumbnail", "s"],
  ["files", "files", "m"],
];

const postCreateCompany: ActionDefinition<Input, ActionResult> = {
  key: "post-create-company",
  type: "perform",
  resource: "content",
  title: "Create Company Post",
  description: "Publish a post on a company page the account administers.",
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
    {
      key: "companyUrl",
      label: "Company URL",
      type: "string",
      required: true,
      hint: "URL of the LinkedIn company page.",
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
      "create_company",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default postCreateCompany;
