import type { Param } from "@w6w/types";

/** The two params every list action shares. */
export const LIST_PARAMS: Param[] = [
  { key: "returnAll", label: "Return All", type: "boolean", default: false },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    hint: "Max number of results when Return All is off.",
  },
];

/** The contract a nested resource hangs off. */
export const CONTRACT_PARAM: Param = {
  key: "contractId",
  label: "Contract ID",
  type: "string",
  required: true,
  default: "",
};
