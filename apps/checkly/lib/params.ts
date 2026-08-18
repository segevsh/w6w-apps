import type { Param } from "@w6w/types";

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
    hint: "Maximum results when Return All is off. Checkly caps a page at 100.",
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];

/** The eight kinds of monitor Checkly runs, each with its own create endpoint. */
export const CHECK_TYPES = [
  "api",
  "browser",
  "multistep",
  "heartbeat",
  "tcp",
  "dns",
  "ssl",
  "icmp",
  "url",
] as const;
