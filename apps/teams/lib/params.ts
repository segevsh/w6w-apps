/**
 * Param fragments shared by the actions.
 *
 * Graph applies the same OData vocabulary (`$select`, `$filter`, `$top`) and the
 * same `@odata.nextLink` paging to every Teams collection, so declaring those
 * fields once keeps nine list/read actions honest with each other. Each helper
 * returns a fresh array, so an action can splice in its own fields without
 * mutating a shared object.
 *
 * These are plain data — evaluated at import time, so `describe()` still sees a
 * concrete `Param[]` on every action.
 */
import type { OutputField, Param } from "@w6w/types";

/** The team (group) id. A GUID; `List Teams` is the way to find it. */
export const teamIdParam: Param = {
  key: "teamId",
  label: "Team",
  type: "string",
  required: true,
  placeholder: "fbe2bf47-16c8-47cf-b4a5-4b9b187c508b",
  hint: "The team's id (a GUID — same value as the backing Microsoft 365 group). Use List Teams.",
};

/** The channel id — a thread id, not a GUID. */
export const channelIdParam: Param = {
  key: "channelId",
  label: "Channel",
  type: "string",
  required: true,
  placeholder: "19:4a95f7d8db4c4e7fae857bcebe0623e6@thread.tacv2",
  hint: "The channel's id, e.g. `19:…@thread.tacv2`. Use List Channels or Get Primary Channel.",
};

/** The chat id — a thread id for group/meeting chats, or a paired id for 1:1. */
export const chatIdParam: Param = {
  key: "chatId",
  label: "Chat",
  type: "string",
  required: true,
  placeholder: "19:2da4c29f6d7041eca70b638b43d45437@thread.v2",
  hint:
    "The chat's id, e.g. `19:…@thread.v2` (group or meeting) or `19:…@unq.gbl.spaces` (one-on-one). Use List Chats — Graph has no API to create a chat from scratch here.",
};

/** `$select`. Every Teams read endpoint that supports any OData at all supports this. */
export function selectParam(hint?: string): Param {
  return {
    key: "select",
    label: "Select fields",
    type: "string",
    repeat: true,
    advanced: true,
    hint: hint ??
      "OData `$select`. Returns only these properties — markedly faster on large collections.",
  };
}

/** `$filter`, where the endpoint documents support for it. */
export function filterParam(hint: string): Param {
  return {
    key: "filter",
    label: "Filter",
    type: "string",
    advanced: true,
    hint,
  };
}

/**
 * `$top` and the `@odata.nextLink` continuation controls.
 *
 * There is no `$skip` here, unlike the mail endpoints: none of the Teams
 * collections document it, and the message collections document only `$top`
 * (capped at 50) plus the returned link. `nextLink` is an absolute URL rather
 * than an opaque token — Graph's paging guidance is to replay it verbatim.
 */
export function pagingParams(opts: { defaultTop?: number; maxTop?: number } = {}): Param[] {
  const defaultTop = opts.defaultTop ?? 20;
  const maxTop = opts.maxTop ?? 50;
  return [
    {
      key: "top",
      label: "Page size",
      type: "number",
      default: defaultTop,
      validation: { integer: true, min: 1, max: maxTop },
      hint: `OData \`$top\` — results per request, 1 to ${maxTop}.`,
    },
    ...continuationParams(),
  ];
}

/**
 * The continuation controls on their own, for the collections that document
 * `@odata.nextLink` but **not** `$top` — `GET /teams/{id}/channels` is the one
 * that matters here, whose reference lists only `$filter` and `$select`.
 */
export function continuationParams(): Param[] {
  return [
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

/**
 * The composition fields shared by Send Channel Message, Reply to Channel
 * Message and Send Chat Message.
 *
 * `subject` is accepted by all three but only *renders* on a channel message —
 * `chatMessage.subject` is documented as applying to channel messages, so the
 * chat action leaves it out rather than offering a field that does nothing.
 */
export function messageBodyParams(): Param[] {
  return [
    { key: "content", label: "Message", type: "text", required: true },
    {
      key: "contentType",
      label: "Format",
      type: "select",
      default: "html",
      options: [
        { value: "html", label: "HTML" },
        { value: "text", label: "Plain text" },
      ],
      hint:
        "`html` is the default because links and `<at>` mentions only render under it. Teams strips markup it does not support.",
    },
    importanceParam,
  ];
}

/**
 * `chatMessage.subject` — channel messages only.
 *
 * Graph documents **summary** as "Only applies to channel chat messages, not
 * chat messages in a chat", and the subject line likewise only renders on a
 * channel post, so the chat action does not offer this field.
 */
export const subjectParam: Param = {
  key: "subject",
  label: "Subject",
  type: "string",
  hint: "Plaintext subject line. Renders as the post's title in a channel.",
};

/** The chat-message importance enum. */
export const importanceParam: Param = {
  key: "importance",
  label: "Importance",
  type: "select",
  advanced: true,
  options: [
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
  ],
  hint: "Graph's `chatMessage.importance`. Omitted means `normal`.",
};

/** The standard `{ value, nextLink, pages }` output of every list action. */
export function pagedOutput(label: string): OutputField[] {
  return [
    { key: "value", type: "array", label },
    { key: "nextLink", type: "string", label: "Next link" },
    { key: "pages", type: "number", label: "Pages fetched" },
  ];
}
