import assistantList from "../actions/assistant-list.ts";
import { readOffsetPages, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c): `GET /assistants/` takes `limit`/`offset` and documents no sort or filter
 * (https://docs.synthflow.ai/openapi.json, verified 2026-11-10), so the list is read whole (up to 10 pages
 * of 100; a larger list is refused with an error, not truncated) and only added rows are events.
 */
export default snapshotTrigger({
  key: "new-agent",
  title: "New Agent",
  description: "The run gets each agent (assistant) newly created in the workspace.",
  output: [
    { key: "model_id", type: "string", label: "Agent ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
  ],
  sample: { model_id: "agent-1", name: "Reception", type: "outbound" },
  rows: (_p, ctx) => readOffsetPages("new-agent", assistantList, {}, ctx),
  idOf: (r) => String(r.model_id ?? ""),
});
