import type { ActionDefinition } from "@w6w/types";
import submitterList from "../actions/submitter-list.ts";
import { sinceTrigger } from "../lib/triggers.ts";

export default sinceTrigger({
  key: "new-completed-submitter",
  title: "New Completed Submitter",
  description: "The run gets each submitter who has just completed signing a DocuSeal form.",
  async load(since, _params, ctx) {
    const result = await (submitterList as ActionDefinition).execute({
      completedAfter: since,
      returnAll: true,
    }, ctx);
    // returnAll drains the whole window in one call, so there is never a resume position.
    return { items: Array.isArray(result) ? result : [] };
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  stampOf: (item) =>
    Date.parse(String((item as { completed_at?: unknown }).completed_at ?? "")) || 0,
  output: [
    { key: "id", type: "number", label: "Submitter ID" },
    { key: "submission_id", type: "number", label: "Submission ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
    { key: "completed_at", type: "string", label: "Completed at" },
  ],
  sample: {
    id: 7,
    submission_id: 3,
    email: "signer@example.com",
    status: "completed",
    completed_at: "2026-11-09T10:00:00.000Z",
  },
});
