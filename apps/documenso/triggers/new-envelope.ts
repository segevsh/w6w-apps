import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import envelopeFind from "../actions/envelope-find.ts";

/**
 * Wraps `envelope-find` (`GET /envelope`). Documenso's v2 OpenAPI lists `orderByDirection` with
 * `default: "desc"` and `orderByColumn` with the single value `createdAt`, so the first page is
 * the newest envelopes (https://app.documenso.com/api/v2/openapi.json, verified 2026-11-09).
 */
export default pollFromListAction({
  key: "new-envelope",
  title: "New Document",
  description: "The run gets each newly created Documenso document (envelope).",
  action: envelopeFind as unknown as ActionDefinition,
  input: () => ({ type: "DOCUMENT", limit: 100 }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Envelope ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "recipients", type: "array", label: "Recipients" },
  ],
  sample: {
    id: "envelope_abcdefhiklmnorst",
    title: "Contract",
    status: "DRAFT",
    createdAt: "2026-11-09T10:00:00.000Z",
    recipients: [],
  },
  maxPages: 1,
});
