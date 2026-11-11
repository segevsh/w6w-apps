import type { ActionDefinition } from "@w6w/types";
import epicList from "../actions/epic-list.ts";
import { SNAPSHOT_PAGE_SIZE, snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /api/v3/epics/paginated` documents paging but no order, so each check reads every page (100 a page, up to 50 pages), so each check diffs the ids. */
export default snapshotTrigger({
  key: "new-epic",
  title: "New Epic",
  description: "The run gets each newly created epic.",
  action: epicList as unknown as ActionDefinition,
  input: () => ({ page: 1, pageSize: SNAPSHOT_PAGE_SIZE }),
  output: [
    { key: "id", type: "number", label: "Epic ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "state", type: "string", label: "State" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: 31, name: "Checkout revamp", state: "to do", created_at: "2026-11-10T09:00:00Z" },
});
