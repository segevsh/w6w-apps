import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/issue-list.ts";

interface Item {
  id?: string | number;
  contactId?: string | number;
  shipmentId?: string | number;
  sequenceId?: string | number;
}

const newIssue = pollFromListAction({
  key: "new-issue",
  title: "New Issue",
  description: "The run gets each newly created issue.",
  action,
  input: (_params) => ({ limit: 100 }),
  items: (result) => {
    const r = result as unknown[];
    return Array.isArray(r) ? r : [];
  },
  idOf: (item) => {
    const value = item as Item;
    return String(value.id ?? value.contactId ?? value.shipmentId ?? value.sequenceId ?? "");
  },
  params: action.params,
  output: [{ key: "id", type: "string", label: "Issue ID" }],
  sample: { id: "issue-a" },
  maxPages: 1,
});

export default newIssue;
