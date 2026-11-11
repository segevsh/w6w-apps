import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import submissionList from "../actions/submission-list.ts";
import { FORM_ID_PARAM } from "../lib/triggers.ts";

/**
 * New submission by polling — the same `submission-list` action (`GET /forms/{id}/submissions`),
 * newest first. A fallback for forms whose webhook cannot be used; see the README.
 */
export default pollFromListAction<{ formId: string }>({
  key: "new-submission-poll",
  title: "New Submission (poll)",
  description:
    "The run gets each new submission of the selected Formstack form, checked on a schedule.",
  action: submissionList as unknown as ActionDefinition,
  input: (params) => ({ formId: params.formId, order: "DESC", pageSize: 50 }),
  // V2025 answers `{ page, submissions: [...] }`; `data` is read too for the older shape.
  items: (result) => {
    const r = result as { submissions?: unknown[] | null; data?: unknown[] | null };
    return r.submissions ?? r.data ?? [];
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [FORM_ID_PARAM],
  output: [
    { key: "id", type: "number", label: "Submission ID" },
    { key: "formId", type: "number", label: "Form ID" },
    { key: "timestamp", type: "string", label: "Submitted at" },
    { key: "data", type: "object", label: "Answers" },
  ],
  sample: {
    id: 987654321,
    formId: 1234567,
    timestamp: "2026-11-09 12:00:00",
    data: { "1": { field: "1", value: "Ada Lovelace" } },
  },
});
