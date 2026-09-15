import type { Param } from "@w6w/types";

/** Shared `documentId` query param — every Document action needs it. */
export const documentIdParam: Param = {
  key: "documentId",
  label: "Document ID",
  type: "string",
  required: true,
  hint: "The document's GUID (from Send Document, List Documents, or a previous action's output).",
};

/** Shared `templateId` query param — every Template action needs it. */
export const templateIdParam: Param = {
  key: "templateId",
  label: "Template ID",
  type: "string",
  required: true,
  hint: "The template's GUID (from List Templates).",
};

/**
 * The document summary fields this app surfaces from BoldSign's `Document` /
 * `DocumentProperties` resource. Not exhaustive — the real object also
 * carries per-signer field placements, form groups and the full audit
 * history — these are the fields a workflow typically needs.
 */
export const documentSummaryOutput = [
  { key: "documentId", type: "string" as const, label: "Document ID" },
  { key: "messageTitle", type: "string" as const, label: "Document title" },
  { key: "status", type: "string" as const, label: "Status" },
  {
    key: "createdDate",
    type: "string" as const,
    label: "Created (Unix epoch seconds)",
  },
  { key: "expiryDate", type: "string" as const, label: "Expiry (Unix epoch seconds)" },
];
