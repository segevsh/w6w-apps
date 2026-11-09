import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import searchPeople from "../actions/search-people.ts";

type Item = Record<string, unknown>;

export default pollFromListAction<Record<string, unknown>>({
  key: "new-person",
  title: "New Person",
  description: "The run gets each newly created person (lead) in Follow Up Boss, oldest first.",
  action: searchPeople as unknown as ActionDefinition,
  input: () => ({ sort: "-created", limit: 100 }),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: (item) => {
    const i = item as Item;
    return String(i.id ?? "");
  },
  output: [
    { key: "id", type: "number", label: "Person ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "stage", type: "string", label: "Stage" },
    { key: "source", type: "string", label: "Source" },
    { key: "created", type: "string", label: "Created" },
    { key: "updated", type: "string", label: "Updated" },
  ],
  sample: {
    id: 101,
    name: "Ada Lovelace",
    stage: "Lead",
    source: "Zillow",
    created: "2026-11-09T10:00:00Z",
    updated: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
