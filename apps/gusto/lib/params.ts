import type { Param } from "@w6w/types";

/**
 * The company an action works on.
 *
 * Optional because the Connection normally records one — a Gusto token usually
 * reaches exactly one company, and `afterConnect` stores it. It stays available
 * for the administrator who runs several.
 */
export const COMPANY_PARAM: Param = {
  key: "companyId",
  label: "Company ID",
  type: "string",
  default: "",
  advanced: true,
  hint: "Defaults to the company on this connection. `token-info` lists the ones this token " +
    "reaches.",
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
    hint: "Maximum results when Return All is off. Gusto's page size caps at 100.",
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];

/**
 * Gusto's optimistic lock, required on every write.
 *
 * The value is the `version` string on the record as it was last read. Gusto
 * rejects a write carrying a stale one, which is how two systems editing the
 * same employee do not silently overwrite each other — so an update is always
 * read-then-write, and the caller decides what they are overwriting rather than
 * this app re-reading and forcing it through.
 */
export const VERSION_PARAM: Param = {
  key: "version",
  label: "Version",
  type: "string",
  required: true,
  default: "",
  hint: "The `version` from the record you just read. Gusto rejects a stale one rather than " +
    "overwriting somebody else's change — read the record immediately before updating it.",
};
