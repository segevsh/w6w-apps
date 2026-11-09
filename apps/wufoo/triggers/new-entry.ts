import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import entryList from "../actions/entry-list.ts";

interface Params {
  identifier: string;
}

function entryId(entry: unknown): string {
  const id = (entry as { EntryId?: unknown }).EntryId;
  if (typeof id !== "string" || !id) {
    throw new Error("Wufoo entry list returned an entry without EntryId");
  }
  return id;
}

export default pollFromListAction<Params>({
  key: "new-entry",
  title: "New Form Entry",
  description: "Fires when a new submission is added to the selected Wufoo form.",
  action: entryList as unknown as ActionDefinition,
  input: ({ identifier }) => ({
    identifier,
    sort: "EntryId",
    sortDirection: "DESC",
    pageSize: 100,
    system: true,
  }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: entryId,
  params: [{ key: "identifier", label: "Form hash or title", type: "string", required: true }],
  output: [
    { key: "EntryId", type: "string", label: "Entry ID" },
    { key: "DateCreated", type: "string", label: "Created at" },
    { key: "Field1", type: "string", label: "First form field" },
  ],
  sample: { EntryId: "42", DateCreated: "2026-11-09 12:00:00", Field1: "Ada" },
});
