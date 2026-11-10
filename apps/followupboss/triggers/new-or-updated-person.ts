import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import searchPeople from "../actions/search-people.ts";

type Item = Record<string, unknown>;

export default pollFromListAction<Record<string, unknown>>({
  key: "new-or-updated-person",
  title: "New or Updated Person",
  description:
    "The run gets each person that is newly created or edited in Follow Up Boss, once per edit.",
  action: searchPeople as unknown as ActionDefinition,
  input: () => ({ sort: "-updated", limit: 100 }),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: (item) => {
    const i = item as Item;
    return String(i.id ?? "") + ":" + String(i.updated ?? "");
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
