import type { Param } from "@w6w/types";

/** Shared `Param` fragments, every field copied from the REST v2.0 reference pages. */

export const layersParam: Param = {
  key: "layers",
  label: "Layers",
  type: "json",
  hint: 'Layer overrides keyed by the layer NAME from the template, e.g. `{"title":{"text":' +
    '"Hello"},"img":{"image":"https://…/a.jpg"},"sub":{"hide":true}}`. Properties per layer ' +
    "type (text, picture, shape, browserframe, barcode, rating, subtitle) are in the Layers page " +
    "of the Placid docs; unset properties keep the template default.",
};

export const webhookParam: Param = {
  key: "webhook_success",
  label: "Webhook URL",
  type: "string",
  hint: "Placid POSTs the finished record to this URL once rendering completes.",
};

export const passthroughParam: Param = {
  key: "passthrough",
  label: "Passthrough",
  type: "string",
  hint: "String or JSON array, up to 1024 characters. Saved and sent back in later webhooks and " +
    "retrievals of this render.",
};

export const transferParam: Param = {
  key: "transfer",
  label: "Transfer to S3",
  type: "json",
  secret: true,
  advanced: true,
  hint: 'Also copy the result to your S3-compatible storage: `{"to":"s3","key":"…","secret":"…",' +
    '"region":"…","bucket":"…","visibility":"public","path":"out/file.ext","endpoint":"…",' +
    '"token":"…"}`. Placid never stores the credentials. `path` is the full object key and an ' +
    "existing object there is OVERWRITTEN.",
};

export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint: "The `nextCursor` of a previous call (the `cursor` query value of `links.next`). Leave " +
    "empty for the first page.",
};

export const perPageParam: Param = {
  key: "per_page",
  label: "Page size",
  type: "number",
  validation: { integer: true, min: 1, max: 100 },
  hint: "Max 100. Omitted: Placid returns every collection in one response.",
};

export const pageOutput = [
  { key: "data", type: "array" as const, label: "Items" },
  { key: "nextCursor", type: "string" as const, label: "Next cursor (null on the last page)" },
  { key: "prevCursor", type: "string" as const, label: "Previous cursor" },
  { key: "perPage", type: "number" as const, label: "Page size" },
];

export const renderOutput = (urlKey: string) => [
  { key: "id", type: "number" as const, label: "ID" },
  { key: "status", type: "string" as const, label: "Status (queued, finished, error)" },
  { key: urlKey, type: "string" as const, label: "URL of the finished file (null until finished)" },
  { key: "polling_url", type: "string" as const, label: "Polling URL" },
];
