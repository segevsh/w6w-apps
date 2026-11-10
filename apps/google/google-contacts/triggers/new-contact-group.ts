import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listContactGroups from "../actions/list-contact-groups.ts";

export default pollFromListAction({
  key: "new-contact-group",
  title: "New Contact Group",
  description: "The run gets each newly discovered contact group.",
  action: listContactGroups,
  input: () => ({ pageSize: 200 }),
  items: (result) => (result as { contactGroups?: unknown[] }).contactGroups ?? [],
  idOf: (item) => String((item as { resourceName?: unknown }).resourceName ?? ""),
  output: [{ key: "resourceName", type: "string", label: "Contact group resource name" }],
  sample: { resourceName: "contactGroups/123" },
  maxPages: 1,
});
