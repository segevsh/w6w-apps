import { pollFromListAction } from "../../_shared/poll/mod.ts";
import entityList from "../actions/entity-list.ts";

/** `GET /entities` sorts by `name` or `lastUpdated`; `DESC` puts the latest edit first. */
export default pollFromListAction({
  key: "new-or-updated-entity",
  title: "New or Updated Entity",
  description: "The run gets each legal entity that is newly created or updated.",
  action: entityList,
  input: () => ({ page: 0, pageSize: 100, sortField: "lastUpdated", sortDirection: "DESC" }),
  items: (result) => (result as { list?: unknown[] }).list ?? [],
  idOf: (item) => {
    const e = item as { id?: unknown; lastUpdated?: unknown };
    return `${String(e.id ?? "")}:${String(e.lastUpdated ?? "")}`;
  },
  output: [
    { key: "id", type: "string", label: "Entity ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "lastUpdated", type: "string", label: "Last updated" },
  ],
  sample: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Ironclad, Inc.",
    status: "active",
    lastUpdated: "2026-11-10T09:00:00Z",
  },
  maxPages: 1,
});
