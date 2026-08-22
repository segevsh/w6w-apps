import type { Param } from "@w6w/types";

/** The conversation an action works on. */
export const CONVERSATION_PARAM: Param = {
  key: "conversationId",
  label: "Conversation ID",
  type: "string",
  required: true,
  default: "",
  placeholder: "cnv_55c8c149",
  hint: "Front's id for the thread — `cnv_…`. A conversation holds every message, comment and " +
    "tag on one customer issue.",
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
    hint: "Maximum results when Return All is off. Front's page size caps at 100.",
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];

/**
 * The statuses a conversation list can be filtered by.
 *
 * `open` is not in this list, and that is Front's doing rather than an
 * omission: the `q[statuses]` filter takes the four states a conversation is
 * *stored* in, and an open conversation is either `assigned` or `unassigned`.
 * A company with ticketing enabled gets `status_categories` (open / waiting /
 * resolved) as an alternative axis, which is why the filter is a free list
 * rather than a single select.
 */
export const CONVERSATION_STATUSES = [
  { value: "assigned", label: "Assigned — open, with an owner" },
  { value: "unassigned", label: "Unassigned — open, nobody owns it" },
  { value: "archived", label: "Archived — done" },
  { value: "trashed", label: "Trashed" },
];
