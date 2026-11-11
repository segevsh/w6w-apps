import knowledgeBaseList from "../actions/knowledge-base-list.ts";
import { readOffsetPages, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c): `GET /knowledge_base` takes `limit`/`offset` and documents no sort or filter
 * (https://docs.synthflow.ai/openapi.json, verified 2026-11-10), so the list is read whole (up to 10 pages
 * of 100; a larger list is refused with an error, not truncated) and only added rows are events.
 */
export default snapshotTrigger({
  key: "new-knowledge-base",
  title: "New Knowledge Base",
  description: "The run gets each knowledge base newly created in the workspace.",
  output: [
    { key: "id", type: "string", label: "Knowledge base ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "kb-1", name: "Returns policy" },
  rows: (_p, ctx) => readOffsetPages("new-knowledge-base", knowledgeBaseList, {}, ctx),
  idOf: (r) => String(r.id ?? ""),
});
