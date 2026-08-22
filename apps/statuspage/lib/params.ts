import type { Param } from "@w6w/types";

/** The page an action works on. */
export const PAGE_PARAM: Param = {
  key: "pageId",
  label: "Page ID",
  type: "string",
  default: "",
  advanced: true,
  hint: "Defaults to the connection's page. `page-list` shows the ones this key can reach.",
};

/** Paging, shared by every list action. */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "⚠️ Each page is a request, and Statuspage allows only ONE per second.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];
