import type { ActionDefinition } from "@w6w/types";
import { compact, csv, EgnyteClient, unset } from "../lib/client.ts";
import { pathParam } from "../lib/params.ts";

interface Input {
  path: string;
  type: "file" | "folder" | "upload";
  accessibility?: string;
  useDefaultSettings?: boolean;
  recipients?: string;
  sendEmail?: boolean;
  message?: string;
  notify?: boolean;
  linkToCurrent?: boolean;
  expiryDate?: string;
  expiryClicks?: number;
  password?: string;
  protection?: string;
}

const linkCreate: ActionDefinition<Input> = {
  key: "link-create",
  type: "perform",
  resource: "link",
  title: "Create Link",
  description:
    "Create a shareable link to a file, folder or upload destination. Set either an expiry date or an expiry click count, not both.",
  idempotent: false,
  params: [
    pathParam("Absolute path of the target (include the file name for file links)."),
    {
      key: "type",
      label: "Link type",
      type: "select",
      required: true,
      options: [
        { value: "file", label: "File" },
        { value: "folder", label: "Folder" },
        { value: "upload", label: "Upload" },
      ],
    },
    {
      key: "accessibility",
      label: "Who can open it",
      type: "select",
      options: [
        { value: "anyone", label: "Anyone" },
        { value: "password", label: "Anyone with the password" },
        { value: "domain", label: "Domain users" },
        { value: "recipients", label: "Specific recipients" },
      ],
      hint: "Required unless 'Use domain defaults' is on or the type is upload.",
    },
    {
      key: "useDefaultSettings",
      label: "Use domain defaults",
      type: "boolean",
      advanced: true,
      hint: "Take accessibility and restrictions from the domain's defaults.",
    },
    {
      key: "recipients",
      label: "Recipients",
      type: "string",
      hint: "Comma-separated email addresses (required to send the link by email).",
    },
    { key: "sendEmail", label: "Email the link", type: "boolean", advanced: true },
    { key: "message", label: "Email message", type: "text", advanced: true },
    {
      key: "notify",
      label: "Notify me on access",
      type: "boolean",
      advanced: true,
    },
    {
      key: "linkToCurrent",
      label: "Always the current version",
      type: "boolean",
      advanced: true,
      hint: "File links only.",
    },
    {
      key: "expiryDate",
      label: "Expiry date",
      type: "string",
      advanced: true,
      placeholder: "2026-12-31",
      hint: "YYYY-MM-DD. Cannot be combined with expiry clicks.",
    },
    {
      key: "expiryClicks",
      label: "Expire after clicks",
      type: "number",
      advanced: true,
      validation: { min: 1, max: 10, integer: true },
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      advanced: true,
      hint: "For password links; Egnyte generates one if blank.",
    },
    {
      key: "protection",
      label: "Protection",
      type: "select",
      advanced: true,
      options: [
        { value: "NONE", label: "Standard" },
        { value: "PREVIEW", label: "Preview only" },
      ],
    },
  ],
  output: [
    { key: "links", type: "array", label: "Links" },
    { key: "path", type: "string", label: "Path" },
    { key: "type", type: "string", label: "Type" },
  ],

  execute(input, ctx) {
    return new EgnyteClient(ctx).request("/v1/links", {
      method: "POST",
      body: compact({
        path: input.path,
        type: input.type,
        accessibility: unset(input.accessibility),
        useDefaultSettings: input.useDefaultSettings,
        recipients: csv(input.recipients),
        send_email: input.sendEmail,
        message: unset(input.message),
        notify: input.notify,
        link_to_current: input.linkToCurrent,
        expiry_date: unset(input.expiryDate),
        expiry_clicks: input.expiryClicks,
        password: unset(input.password),
        protection: unset(input.protection),
      }),
    });
  },
};

export default linkCreate;
