import listUsers from "../actions/list-users.ts";
import { createdDescTrigger } from "../lib/triggers.ts";

// https://learn.microsoft.com/en-us/graph/api/user-list (verified 2026-11-10): `createdDateTime`
// supports `$orderby` on user; the advanced-query header is sent as the reference asks for sorted
// directory queries, so page 1 of `createdDateTime desc` is the newest-first feed.
export default createdDescTrigger({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly created user in the directory.",
  action: listUsers as never,
  select: ["id", "displayName", "userPrincipalName", "mail", "createdDateTime"],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "userPrincipalName", type: "string", label: "User principal name" },
    { key: "mail", type: "string", label: "Mail" },
    { key: "createdDateTime", type: "string", label: "Created at" },
  ],
  sample: {
    id: "87d349ed-44d7-43e1-9a83-5f2406dee5bd",
    displayName: "Adele Vance",
    userPrincipalName: "adele@contoso.example",
    mail: "adele@contoso.example",
    createdDateTime: "2026-11-10T09:00:00Z",
  },
});
