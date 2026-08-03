/**
 * Param fragments shared by the actions.
 *
 * Graph applies the same OData query vocabulary (`$select`, `$filter`,
 * `$orderby`, `$top`, `$skip`) and the same `@odata.nextLink` paging to every
 * collection, so declaring those fields once keeps eight list actions honest
 * with each other. Each helper returns a fresh array, so an action can splice in
 * its own fields without mutating a shared object.
 *
 * These are plain data — evaluated at import time, so `describe()` still sees a
 * concrete `Param[]` on every action.
 */
import type { Param } from "@w6w/types";

/**
 * `$select`, `$filter`, `$orderby`.
 *
 * Graph's documented `$filter` + `$orderby` restriction for messages is
 * surfaced as a hint rather than enforced, because it applies to the message
 * collection specifically and the same fragment serves events and folders.
 */
export function odataParams(opts: { orderbyHint?: string; filterHint?: string } = {}): Param[] {
  return [
    {
      key: "select",
      label: "Select fields",
      type: "string",
      repeat: true,
      advanced: true,
      hint:
        "OData `$select`. Returns only these properties — markedly faster on large collections.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      advanced: true,
      hint: opts.filterHint ?? "OData `$filter` expression.",
    },
    {
      key: "orderby",
      label: "Order by",
      type: "string",
      advanced: true,
      hint: opts.orderbyHint ?? "OData `$orderby` expression, e.g. `receivedDateTime desc`.",
    },
  ];
}

/**
 * `$top`, `$skip`, and the `@odata.nextLink` continuation controls.
 *
 * `nextLink` is an absolute URL rather than an opaque token: Graph's paging
 * guidance is to replay the returned link verbatim, never to rebuild it from
 * `$skip`.
 */
export function pagingParams(opts: { defaultTop?: number; maxTop?: number } = {}): Param[] {
  const defaultTop = opts.defaultTop ?? 25;
  const maxTop = opts.maxTop ?? 1000;
  return [
    {
      key: "top",
      label: "Page size",
      type: "number",
      default: defaultTop,
      validation: { integer: true, min: 1, max: maxTop },
      hint: `OData \`$top\` — results per request, 1 to ${maxTop}.`,
    },
    {
      key: "skip",
      label: "Skip",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
      hint: "OData `$skip`. Prefer `Next link` for paging; `$skip` is a count, not a cursor.",
    },
    {
      key: "nextLink",
      label: "Next link",
      type: "string",
      advanced: true,
      hint:
        "The `@odata.nextLink` URL from a previous run. Continues where that run stopped; other query params are ignored because the link already carries them.",
    },
    {
      key: "all",
      label: "Fetch all pages",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Follow `@odata.nextLink` until exhausted or the page cap is reached.",
    },
    {
      key: "maxPages",
      label: "Max pages",
      type: "number",
      default: 10,
      advanced: true,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Upper bound on requests when 'Fetch all pages' is on.",
    },
  ];
}

/** `Prefer: outlook.body-content-type`. Without it Graph always returns HTML. */
export const bodyContentTypeParam: Param = {
  key: "bodyContentType",
  label: "Return body as",
  type: "select",
  advanced: true,
  options: [
    { value: "html", label: "HTML (Graph default)" },
    { value: "text", label: "Plain text" },
  ],
  hint: "Sets the `Prefer: outlook.body-content-type` header.",
};

/** `Prefer: outlook.timezone`. Without it Graph renders start/end in UTC. */
export const timeZoneParam: Param = {
  key: "timeZone",
  label: "Time zone",
  type: "string",
  advanced: true,
  placeholder: "Pacific Standard Time",
  hint:
    "Windows or IANA time-zone name. Sets `Prefer: outlook.timezone` so start/end come back in this zone instead of UTC.",
};

/** The importance enum, identical on messages and events. */
export const importanceParam: Param = {
  key: "importance",
  label: "Importance",
  type: "select",
  advanced: true,
  options: [
    { value: "low", label: "Low" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" },
  ],
};

/**
 * The message-composition fields shared by Send Message and Create Draft.
 *
 * Graph carries exactly one body per message (`body.contentType` is `Text` OR
 * `HTML`) — unlike an RFC 2822 multipart/alternative, there is no way to send
 * both, so this is a single content field plus a type selector.
 */
export function messageBodyParams(): Param[] {
  return [
    { key: "to", label: "To", type: "string", repeat: true, required: true },
    { key: "subject", label: "Subject", type: "string" },
    { key: "bodyContent", label: "Body", type: "text" },
    {
      key: "bodyType",
      label: "Body format",
      type: "select",
      default: "HTML",
      options: [
        { value: "HTML", label: "HTML" },
        { value: "Text", label: "Plain text" },
      ],
    },
    { key: "cc", label: "CC", type: "string", repeat: true, advanced: true },
    { key: "bcc", label: "BCC", type: "string", repeat: true, advanced: true },
    { key: "replyTo", label: "Reply-To", type: "string", repeat: true, advanced: true },
    {
      key: "from",
      label: "From",
      type: "string",
      advanced: true,
      hint:
        "Send on behalf of a shared mailbox or delegated address. Must be a mailbox the account may actually send from.",
    },
    importanceParam,
    {
      key: "attachments",
      label: "Attachments",
      type: "array",
      advanced: true,
      hint: "Inline file attachments. `contentBytes` must be base64.",
      item: {
        type: "object",
        fields: [
          { key: "name", label: "File name", type: "string", required: true },
          { key: "contentType", label: "MIME type", type: "string", placeholder: "text/plain" },
          {
            key: "contentBytes",
            label: "Content (base64)",
            type: "text",
            required: true,
          },
        ],
      },
    },
  ];
}
