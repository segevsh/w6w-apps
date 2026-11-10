import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import formGetMany from "../actions/form-get-many.ts";
import { FORM_OUTPUT, FORM_SAMPLE, formId, formItems, WORKSPACE_PARAM } from "../lib/lists.ts";

interface Params {
  workspaceId?: string;
}

/** Newest-first: `GET /forms?sort_by=created_at&order_by=desc` (retrieve-forms, 2026-11-10). */
export default pollFromListAction<Params>({
  key: "new-form",
  title: "New Form",
  description:
    "Fires when a new Typeform form is created in the account (optionally one workspace). The run gets the form's id, title, links and timestamps.",
  action: formGetMany as unknown as ActionDefinition,
  input: (params) => ({
    workspaceId: params.workspaceId || undefined,
    sortBy: "created_at",
    orderBy: "desc",
    pageSize: 50,
  }),
  items: formItems,
  idOf: formId,
  params: [WORKSPACE_PARAM],
  output: FORM_OUTPUT,
  sample: FORM_SAMPLE,
});
