/**
 * Params and output blocks shared across Docusign's list endpoints.
 *
 * Docusign pages with `count` + `start_position` on every collection this app
 * touches (envelopes, templates, users). List responses echo the window back as
 * `resultSetSize`, `startPosition`, `endPosition` and `totalSetSize`, and the
 * envelope and template lists additionally hand back ready-made `nextUri` /
 * `previousUri` strings. Those URIs are *paths*, not absolute URLs, so they are
 * surfaced as output for a caller to read rather than followed automatically.
 */
import type { OutputField, Param } from "@w6w/types";

export interface PagingInput {
  count?: number;
  startPosition?: number;
}

export const paging: Param[] = [
  {
    key: "count",
    label: "Count",
    type: "number",
    hint: "Maximum results to return. Docusign caps this at 1000.",
    validation: { min: 1, max: 1000, integer: true },
  },
  {
    key: "startPosition",
    label: "Start position",
    type: "number",
    hint: "Zero-based index of the first result — the offset half of Docusign's paging.",
    validation: { min: 0, integer: true },
  },
];

/** The envelope id every envelope-scoped route takes in its path. */
export const envelopeIdParam: Param = {
  key: "envelopeId",
  label: "Envelope ID",
  type: "string",
  required: true,
  hint:
    "The envelope's GUID, e.g. `93be49ab-xxxx-xxxx-xxxx-f752070d71ec`. Returned by Create Envelope and List Envelopes.",
};

/** The shape every envelope collection answers with. */
export const envelopeListOutput: OutputField[] = [
  { key: "envelopes", type: "array", label: "Envelopes" },
  { key: "resultSetSize", type: "string", label: "Result set size" },
  { key: "totalSetSize", type: "string", label: "Total set size" },
  { key: "nextUri", type: "string", label: "Next page URI" },
  { key: "previousUri", type: "string", label: "Previous page URI" },
];

/**
 * Docusign's envelope status vocabulary, as documented on the `status` query
 * parameter of `Envelopes: listStatusChanges`. `any` is the API's own wildcard.
 */
export const ENVELOPE_STATUSES = [
  "any",
  "completed",
  "created",
  "declined",
  "deleted",
  "delivered",
  "processing",
  "sent",
  "signed",
  "timedout",
  "voided",
] as const;
