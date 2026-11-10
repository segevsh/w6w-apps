import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/query-sessions.ts";

const trigger = pollFromListAction({
  key: "new-session",
  title: "New Agent Session",
  description:
    "The run gets each Notion agent session the connection can read, checked by created time, newest first.",
  action,
  input: () => ({ sorts: [{ property: "created_at", direction: "descending" }], pageSize: 25 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Session ID" },
    { key: "agent_id", type: "string", label: "Agent ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    "object": "session",
    "id": "5d0e9c2a-2f4b-4a1e-8c3d-9b7a6f5e4d3c",
    "agent_id": "7f3c1a52-0d1e-4b6a-9a77-1c2d3e4f5a6b",
    "status": "idle",
    "created_at": "2026-11-10T08:00:00.000Z",
    "updated_at": "2026-11-10T08:05:00.000Z",
  },
  maxPages: 1,
});

export default trigger;
