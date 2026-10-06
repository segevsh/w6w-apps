import type { Param } from "@w6w/types";

type Opts = { required?: boolean; hint?: string; default?: string | number | boolean };

export const str = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "string", ...o }) as Param;
export const text = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "text", ...o }) as Param;
export const int = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "number", validation: { integer: true }, ...o }) as Param;
export const bool = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "boolean", ...o }) as Param;
export const select = (
  key: string,
  label: string,
  values: string[],
  o: Opts = {},
): Param =>
  ({
    key,
    label,
    type: "select",
    options: values.map((v) => ({ value: v, label: v })),
    ...o,
  }) as Param;

const TS_HINT = "ISO 8601 with a timezone offset, e.g. 2026-01-31T09:00:00Z.";

export const pageParam = str("page", "Page cursor", {
  hint: "The nextPage value of the previous result. Reuse it with the same filters and order.",
});
export const limitParam = int("limit", "Limit", {
  hint: "Page size, 1 to 100 (vendor default 50).",
});
export const orderBy = select("order_by", "Order by", ["created_at", "updated_at"], {
  hint: "Vendor default is updated_at.",
});

export const createdAfter = str("filter_by_created_after", "Created after", { hint: TS_HINT });
export const createdBefore = str("filter_by_created_before", "Created before", { hint: TS_HINT });
export const updatedAfter = str("filter_by_updated_after", "Updated after", { hint: TS_HINT });
export const updatedBefore = str("filter_by_updated_before", "Updated before", { hint: TS_HINT });

export const DATE_FILTERS = [
  "filter_by_created_after",
  "filter_by_created_before",
  "filter_by_updated_after",
  "filter_by_updated_before",
] as const;
export const dateFilterParams = [createdAfter, createdBefore, updatedAfter, updatedBefore];

export const noteId = str("note_id", "Note ID", { required: true, hint: "The note's UUID." });
export const collectionId = str("collection_id", "Collection ID", {
  required: true,
  hint: "The collection's UUID.",
});
export const timestampHint = TS_HINT;
