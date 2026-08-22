import type { Param } from "@w6w/types";

/** Paging, shared by the list actions. Fivetran accepts 1..1000. */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Follow the cursor to the end.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 100,
    showIf: { "==": [{ var: "returnAll" }, false] },
    hint: "Fivetran accepts 1 to 1000 and defaults to 100.",
  },
  {
    key: "maxPages",
    label: "Maximum Pages",
    type: "number",
    default: 20,
    advanced: true,
    showIf: { "==": [{ var: "returnAll" }, true] },
  },
];

/**
 * The connection a sync acts on.
 *
 * Fivetran renamed connectors to connections; older docs, the Terraform
 * provider and most tutorials still say "connector", and the ids are the same.
 */
export const CONNECTION_PARAM: Param = {
  key: "connectionId",
  label: "Connection ID",
  type: "string",
  required: true,
  default: "",
  hint: "From `connection-list`. Older docs call these connectors — same ids.",
};
