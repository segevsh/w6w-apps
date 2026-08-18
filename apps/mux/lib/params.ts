import type { Param } from "@w6w/types";

/** Paging, shared by every list action. */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Page through every result. Mux's page size caps at 100.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];

/**
 * Mux's own field for the caller's identifier.
 *
 * Anything put here comes back on the asset, on its webhooks and in Mux Data's
 * views — which makes it the join key between Mux's world and yours. Without
 * it, correlating a webhook to a row in your database means keeping a separate
 * map of Mux ids.
 */
export const PASSTHROUGH_PARAM: Param = {
  key: "passthrough",
  label: "Passthrough",
  type: "string",
  default: "",
  hint: "Your own id for this video. Mux returns it on the asset, on every webhook about it, " +
    "and in Data — which makes it the join key back to your own records.",
};
