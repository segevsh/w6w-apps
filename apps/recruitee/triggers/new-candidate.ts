import { walkTrigger } from "../lib/walk.ts";
import candidateList from "../actions/candidate-list.ts";

const LIMIT = 200;
type Candidate = { id?: unknown; created_at?: unknown };

/**
 * Recruitee's candidate list takes `created_after` and pages by `limit` / `offset`: the since-filter
 * shape. A check asks `created_after = last check − 2 min`, pages on while a page is full (a longer
 * window is drained over successive checks, the cursor moving only once it is drained), drops
 * candidates whose `created_at` is before the first check (nothing that existed at the seed is ever
 * emitted) and dedupes by id.
 */
export default walkTrigger({
  key: "new-candidate",
  title: "New Candidate",
  description: "The run gets each newly created candidate.",
  action: candidateList as never,
  first: ({ sinceMs }) => ({
    createdAfter: new Date(sinceMs).toISOString(),
    limit: LIMIT,
    offset: 0,
  }),
  next: (req, _result, got) =>
    got.length >= LIMIT ? { ...req, offset: Number(req.offset) + LIMIT } : undefined,
  items: (result) => (result as { candidates?: unknown[] }).candidates ?? [],
  idOf: (item) => String((item as Candidate).id ?? ""),
  stampOf: (item) => {
    const t = Date.parse(String((item as Candidate).created_at ?? ""));
    return Number.isFinite(t) ? t : undefined;
  },
  output: [{ key: "id", type: "number", label: "Candidate ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "created_at", type: "string", label: "Created at" }],
  sample: { id: 1, name: "Ada Lovelace", created_at: "2026-11-09T10:00:00Z" },
});
