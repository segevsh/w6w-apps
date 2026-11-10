import { pollFromListAction } from "../../_shared/poll/mod.ts";
import checklistList from "../actions/checklist-list.ts";
import {
  checklistInput,
  checklistItems,
  checklistOutput,
  checklistSample,
} from "./new-checklist.ts";

export default pollFromListAction({
  key: "new-or-updated-checklist",
  title: "New or Updated Checklist",
  description: "The run gets each checklist that was created or edited since the last check.",
  action: checklistList,
  input: checklistInput,
  items: checklistItems,
  idOf: (item) => {
    const c = item as { id?: unknown; updated_at?: unknown };
    return `${c.id ?? ""}:${c.updated_at ?? ""}`;
  },
  output: checklistOutput,
  sample: checklistSample,
  maxPages: 1,
});
