import type { OutputField, Param } from "@w6w/types";

/** Shared `Param` / `OutputField` fragments. Names and bounds are from Formspark's OpenAPI. */

export const limitParam: Param = {
  key: "limit",
  label: "Page size",
  type: "number",
  default: 25,
  validation: { min: 1, max: 100, integer: true },
  hint: "Records per page, 1-100. Formspark's own default is 25.",
};

export const startingAfterParam: Param = {
  key: "startingAfter",
  label: "Cursor",
  type: "string",
  hint: "Paste `nextCursor` from the previous page's output to fetch the next page. Cursors are " +
    "opaque: do not build one. A cursor Formspark did not issue is a 400 validation_error.",
};

export const searchParam: Param = {
  key: "search",
  label: "Search",
  type: "string",
  validation: { minLength: 1, maxLength: 256 },
  hint: "Only submissions matching this text (1-256 characters).",
};

export const pageOutput: OutputField[] = [
  { key: "data", type: "array", label: "Records on this page" },
  { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  { key: "nextCursor", type: "string", label: "Cursor for the next page, or null" },
];

export const templateKindParam: Param = {
  key: "kind",
  label: "Template",
  type: "select",
  required: true,
  options: [
    { value: "notification", label: "Notification email" },
    { value: "autoresponder", label: "Autoresponder" },
  ],
};

/** The keys a PATCH may set to `null`, which is how Formspark clears a field. */
export const CLEARABLE = [
  "description",
  "technology",
  "webhookUrl",
  "slackChannel",
  "customHoneypot",
  "customSpamWords",
  "spamProtection",
] as const;

const emails = (v: unknown): string[] | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  const list = (Array.isArray(v) ? v : String(v).split(/[,\n]/))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return list.length ? list : undefined;
};

export interface FormFields {
  name?: string;
  description?: string;
  technology?: string;
  notificationEmails?: string[] | string;
  emailThreading?: boolean;
  automaticSpamFilter?: boolean;
  webhookUrl?: string;
  slackChannel?: string;
  customHoneypot?: string;
  customSpamWords?: string;
  spamProtection?: string;
}

/** The form settings shared by create and update, in the wire's own names. */
export function formBody(input: FormFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (
    const k of [
      "name",
      "description",
      "technology",
      "webhookUrl",
      "slackChannel",
      "customHoneypot",
      "customSpamWords",
      "spamProtection",
    ] as const
  ) {
    const v = input[k];
    if (v !== undefined && v !== null && v !== "") body[k] = v;
  }
  const notificationEmails = emails(input.notificationEmails);
  if (notificationEmails) body.notificationEmails = notificationEmails;
  if (typeof input.emailThreading === "boolean") body.emailThreading = input.emailThreading;
  if (typeof input.automaticSpamFilter === "boolean") {
    body.automaticSpamFilter = input.automaticSpamFilter;
  }
  return body;
}

/** Form-setting params shared by create and update (name is required only on create). */
export const formFieldParams = (nameRequired: boolean): Param[] => [
  {
    key: "name",
    label: "Name",
    type: "string",
    required: nameRequired,
    validation: { minLength: 1, maxLength: 128 },
  },
  {
    key: "description",
    label: "Description",
    type: "string",
    validation: { maxLength: 512 },
  },
  {
    key: "technology",
    label: "Technology",
    type: "string",
    validation: { maxLength: 128 },
    hint: "Free-text label for the stack the form lives in, e.g. Next.js.",
  },
  {
    key: "notificationEmails",
    label: "Notification emails",
    type: "string",
    hint: "Comma- or newline-separated addresses, at most 100. On update this REPLACES the list.",
  },
  { key: "emailThreading", label: "Email threading", type: "boolean" },
  {
    key: "automaticSpamFilter",
    label: "Automatic spam filter",
    type: "boolean",
    hint: "Formspark defaults to on. Turning it off stores every submission, including ones the " +
      "filter would have held back, and each counts against the workspace quota.",
  },
  {
    key: "webhookUrl",
    label: "Webhook URL",
    type: "string",
    validation: { maxLength: 512 },
    hint: "http or https, and must resolve to a public address when called.",
  },
  {
    key: "slackChannel",
    label: "Slack channel",
    type: "string",
    validation: { maxLength: 128 },
  },
  {
    key: "customHoneypot",
    label: "Custom honeypot field",
    type: "string",
    validation: { maxLength: 128 },
  },
  {
    key: "customSpamWords",
    label: "Custom spam words",
    type: "string",
    validation: { maxLength: 2560 },
  },
  {
    key: "spamProtection",
    label: "Spam protection challenge",
    type: "select",
    options: [
      { value: "BOTPOISON", label: "Botpoison" },
      { value: "GOOGLE_RECAPTCHA_V2", label: "Google reCAPTCHA v2" },
      { value: "HCAPTCHA", label: "hCaptcha" },
      { value: "TURNSTILE", label: "Cloudflare Turnstile" },
    ],
    hint: "Can only be set on a form whose secret key for that provider is already stored, which " +
      "is done in the Formspark dashboard.",
  },
];

export const formOutput: OutputField[] = [
  { key: "id", type: "string", label: "Form ID (the id in submit-form.com/{id})" },
  { key: "name", type: "string", label: "Name" },
  { key: "description", type: "string", label: "Description" },
  { key: "technology", type: "string", label: "Technology" },
  { key: "workspaceId", type: "string", label: "Workspace ID" },
  { key: "notificationEmails", type: "array", label: "Notification emails" },
  { key: "emailThreading", type: "boolean", label: "Email threading" },
  { key: "automaticSpamFilter", type: "boolean", label: "Automatic spam filter" },
  { key: "webhookUrl", type: "string", label: "Webhook URL" },
  { key: "slackChannel", type: "string", label: "Slack channel" },
  { key: "customHoneypot", type: "string", label: "Custom honeypot field" },
  { key: "customSpamWords", type: "string", label: "Custom spam words" },
  { key: "spamProtection", type: "string", label: "Spam protection challenge" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "updatedAt", type: "string", label: "Updated at" },
];

export const workspaceOutput: OutputField[] = [
  { key: "id", type: "string", label: "Workspace ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "plan", type: "string", label: "Plan: FREE, BUNDLE_50000 or DEALIFY" },
  { key: "submissionsQuota", type: "number", label: "Submissions quota" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "updatedAt", type: "string", label: "Updated at" },
];

export const templateOutput: OutputField[] = [
  { key: "kind", type: "string", label: "notification or autoresponder" },
  { key: "mode", type: "string", label: "visual or code" },
  { key: "code", type: "string", label: "Template HTML (Handlebars)" },
  { key: "updatedAt", type: "string", label: "Updated at" },
  { key: "paused", type: "boolean", label: "Stopped from sending by Formspark's content check" },
];

export const workspaceIdParam = (hint?: string): Param => ({
  key: "workspaceId",
  label: "Workspace ID",
  type: "string",
  required: true,
  hint: hint ?? "From the List Workspaces action.",
});

export const formIdParam: Param = {
  key: "formId",
  label: "Form ID",
  type: "string",
  required: true,
  hint: "From the List Forms action; it is also the id in https://submit-form.com/{id}.",
};
