import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import formGetMany from "../actions/form-get-many.ts";
import {
  FORM_OUTPUT,
  FORM_SAMPLE,
  formItems,
  formVersionId,
  WORKSPACE_PARAM,
} from "../lib/lists.ts";

interface Params {
  workspaceId?: string;
}

/** Recently-edited-first: `sort_by=last_updated_at&order_by=desc`; an edit is a new event. */
export default pollFromListAction<Params>({
  key: "new-or-updated-form",
  title: "New or Updated Form",
  description:
    "Fires when a Typeform form is created or edited (optionally in one workspace). The run gets the form's id, title, links and timestamps.",
  action: formGetMany as unknown as ActionDefinition,
  input: (params) => ({
    workspaceId: params.workspaceId || undefined,
    sortBy: "last_updated_at",
    orderBy: "desc",
    pageSize: 50,
  }),
  items: formItems,
  idOf: formVersionId,
  params: [WORKSPACE_PARAM],
  output: FORM_OUTPUT,
  sample: FORM_SAMPLE,
});
