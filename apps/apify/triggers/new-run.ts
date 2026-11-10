import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/run-list.ts";
import { idOf, itemsOf, NEWEST_FIRST } from "../lib/triggers.ts";

// GET /actor-runs?desc=1&limit=100&offset=0 — "Get user runs list": "desc: if true or 1 then the
// objects are sorted by the startedAt field in descending order. By default, they are sorted in
// ascending order." https://docs.apify.com/api/v2/actor-runs-get
export default pollFromListAction({
  key: "new-run",
  title: "New Actor Run",
  description: "The run gets each Actor run newly started on the account.",
  action,
  input: () => ({ ...NEWEST_FIRST }),
  items: itemsOf,
  idOf,
  output: [
    { key: "id", type: "string", label: "Run ID" },
    { key: "actId", type: "string", label: "Actor ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "startedAt", type: "string", label: "Started at" },
    { key: "defaultDatasetId", type: "string", label: "Default dataset ID" },
  ],
  sample: {
    id: "run-101",
    actId: "actor-1",
    status: "RUNNING",
    startedAt: "2026-11-09T10:00:00.000Z",
    defaultDatasetId: "dataset-101",
  },
  maxPages: 1,
});
