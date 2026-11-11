import listGroups from "../actions/list-groups.ts";
import { createdDescTrigger } from "../lib/triggers.ts";

// https://learn.microsoft.com/en-us/graph/api/group-list (verified 2026-11-10): `createdDateTime`
// supports `$orderby` on group, so page 1 of `createdDateTime desc` is the newest-first feed.
export default createdDescTrigger({
  key: "new-group",
  title: "New Group",
  description: "The run gets each newly created group in the directory.",
  action: listGroups as never,
  select: ["id", "displayName", "description", "mail", "groupTypes", "createdDateTime"],
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "description", type: "string", label: "Description" },
    { key: "mail", type: "string", label: "Mail" },
    { key: "groupTypes", type: "array", label: "Group types" },
    { key: "createdDateTime", type: "string", label: "Created at" },
  ],
  sample: {
    id: "02bd9fd6-8f93-4758-87c3-1fb73740a315",
    displayName: "Sales Team",
    description: "Everyone in sales",
    mail: "sales@contoso.example",
    groupTypes: ["Unified"],
    createdDateTime: "2026-11-10T09:00:00Z",
  },
});
