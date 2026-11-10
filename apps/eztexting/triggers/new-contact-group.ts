import { snapshotTrigger } from "../lib/triggers.ts";
import groupList from "../actions/group-list.ts";

export default snapshotTrigger({
  key: "new-contact-group",
  title: "New Contact Group",
  description: "The run gets each contact group newly created in the account.",
  action: groupList,
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Group name" },
    { key: "note", type: "string", label: "Notes" },
    { key: "contactsCount", type: "number", label: "Contacts in the group" },
  ],
  sample: { id: "grp-3001", name: "VIP", note: "Top customers", contactsCount: 0 },
});
