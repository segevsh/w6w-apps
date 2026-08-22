import type { Param } from "@w6w/types";

/** The collection almost every action works on. */
export const COLLECTION_PARAM: Param = {
  key: "collection",
  label: "Collection",
  type: "string",
  required: true,
  default: "",
  hint: "From `collection-list`.",
};

/**
 * `wait`, offered on every write.
 *
 * Qdrant defaults it to **false**: the call returns once the operation is
 * accepted, not once it is queryable. These actions default it to true, because
 * a workflow that upserts and then searches assumes it already has that.
 */
export const WAIT_PARAM: Param = {
  key: "wait",
  label: "Wait for the change to apply",
  type: "boolean",
  default: true,
  hint: "Qdrant's own default is false — it returns once the write is ACCEPTED, so an upsert " +
    "followed immediately by a query reliably misses the point. On here.",
};
