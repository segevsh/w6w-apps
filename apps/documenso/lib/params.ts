import type { Param } from "@w6w/types";

/** The envelope an action works on. */
export const ENVELOPE_PARAM: Param = {
  key: "envelopeId",
  label: "Envelope ID",
  type: "string",
  required: true,
  default: "",
  hint: "The envelope — Documenso's unit of signing, holding the documents, recipients and " +
    "fields together.",
};

/** Paging, shared by every list action. */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Page through every result.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    hint: "Maximum results when Return All is off.",
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];
