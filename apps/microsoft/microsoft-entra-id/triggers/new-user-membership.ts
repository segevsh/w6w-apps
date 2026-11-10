import listUserMemberships from "../actions/list-user-memberships.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// https://learn.microsoft.com/en-us/graph/api/user-list-memberof (verified 2026-11-10): `memberOf`
// documents neither `$top` nor `$orderby`, and a user belongs to few groups/roles; read whole, diffed.
export default snapshotTrigger<{ userId: string }>({
  key: "new-user-membership",
  title: "New User Membership",
  description:
    "The run gets each group, directory role or administrative unit the user newly joins.",
  action: listUserMemberships as never,
  params: [{
    key: "userId",
    label: "User",
    type: "string",
    required: true,
    hint: "The user's object id or user principal name.",
  }],
  input: (p) => ({ userId: p.userId }),
  output: [
    { key: "id", type: "string", label: "Object ID" },
    { key: "@odata.type", type: "string", label: "Object type" },
    { key: "displayName", type: "string", label: "Display name" },
  ],
  sample: {
    "@odata.type": "#microsoft.graph.group",
    id: "02bd9fd6-8f93-4758-87c3-1fb73740a315",
    displayName: "Sales Team",
  },
});
