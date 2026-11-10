import issueList from "../actions/issue-list.ts";
import { sinceTrigger } from "../lib/triggers.ts";

/** `GET /issues` lists issues created inside `start_time`..`end_time`; each check asks a short window. */
export default sinceTrigger({
  key: "new-issue",
  title: "New Issue",
  description: "The run gets each newly created support issue.",
  action: issueList,
  pageSize: 200,
  input: ({ since, until }) => ({ startTime: since, endTime: until, limit: 200 }),
  items: (result) => (result as { issues?: unknown[] }).issues ?? [],
  nextPageInput: (input, result) => {
    const r = result as { hasNextPage?: boolean; nextCursor?: string };
    return r.hasNextPage && r.nextCursor ? { ...input, cursor: r.nextCursor } : undefined;
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Issue ID" },
    { key: "number", type: "number", label: "Issue number" },
    { key: "title", type: "string", label: "Title" },
    { key: "state", type: "string", label: "State" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "iss_1",
    number: 42,
    title: "Cannot log in",
    state: "new",
    created_at: "2026-11-10T09:00:00Z",
  },
});
