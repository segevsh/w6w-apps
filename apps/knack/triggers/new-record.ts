import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/record-list.ts";

export default pollFromListAction({
  key: "new-record",
  title: "New Record",
  description:
    "The run gets each newly created record, oldest first, polled from the existing `record-list` action sorted by the creation-time field you choose, descending (`sort_field`, `sort_order=desc`).",
  action,
  input: (params) => ({
    objectKey: String(params.objectKey ?? ""),
    sortField: String(params.sortField ?? ""),
    sortOrder: "desc",
    page: 1,
    rowsPerPage: 100,
  }),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  params: [
    {
      key: "objectKey",
      label: "Object key",
      type: "string",
      required: true,
      placeholder: "object_1",
      hint: "The table to watch, e.g. `object_1`.",
    },
    {
      key: "sortField",
      label: "Created-time field",
      type: "string",
      required: true,
      placeholder: "field_25",
      hint: "A field on that table that records when a row was created (a Date/Time field " +
        "defaulting to now, or an auto-increment number). New rows are the ones that sort first " +
        "on it, descending.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "fields", type: "object", label: "The record's field values (field_1, field_2, …)" },
  ],
  sample: { id: "5f0a1b2c3d4e5f6a7b8c9d0e", field_1: "Ada Lovelace" },
  maxPages: 1,
});
