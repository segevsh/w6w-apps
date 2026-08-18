import type { OutputField, Param } from "@w6w/types";

/** The index an action works on. */
export const INDEX_PARAM: Param = {
  key: "indexUid",
  label: "Index",
  type: "string",
  default: "",
  placeholder: "movies",
  hint: "Falls back to the connection's default index when blank.",
};

/** Paging, shared by the offset-paged list actions. */
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

/**
 * The note every writing action carries.
 *
 * Repeated rather than referenced because it is the one thing a workflow author
 * has to know before wiring a Meilisearch write to anything downstream: the
 * call returns a receipt, and the work happens afterwards.
 */
export const TASK_OUTPUT: OutputField[] = [
  {
    key: "taskUid",
    label: "Task ID — pass to Get Task to find out whether it actually worked",
    type: "number",
  },
  { key: "indexUid", label: "Index", type: "string" },
  {
    key: "status",
    label: "Always `enqueued` here — the real outcome arrives later",
    type: "string",
  },
  { key: "type", label: "Task type", type: "string" },
  { key: "enqueuedAt", label: "Enqueued at", type: "string" },
];
