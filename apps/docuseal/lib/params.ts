import type { Param } from "@w6w/types";

/** Paging, shared by every list action — mirrors DocuSeal's own `limit`/cursor shape. */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Page through every result, following DocuSeal's `after` cursor.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 10,
    hint: "Maximum results when Return All is off. DocuSeal's own default is 10, max 100.",
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];

/** A numeric DocuSeal id, required. */
export function idParam(label: string, hint?: string): Param {
  return { key: "id", label, type: "number", required: true, hint };
}
