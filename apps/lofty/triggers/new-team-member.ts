import type { ActionDefinition } from "@w6w/types";
import { listSnapshot } from "../lib/triggers.ts";
import memberList from "../actions/member-list.ts";

/** No sort or since filter exists on this endpoint (Lofty OpenAPI, https://api.lofty.com/docs/), so the list is diffed by id. */
export default listSnapshot({
  key: "new-team-member",
  title: "New Team Member",
  description: "The run gets each newly added team member: id, name, email and role.",
  action: memberList as unknown as ActionDefinition,
  listKey: "members",
  idKey: "id",
  paged: true,
  output: [
    { key: "id", type: "number", label: "Member ID" },
    { key: "memberUserId", type: "number", label: "User ID used for lead assignment" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "roleName", type: "string", label: "Role" },
  ],
  sample: {
    id: 11,
    memberUserId: 100234,
    firstName: "Dana",
    lastName: "Rivera",
    email: "dana@example.com",
    roleName: "Agent",
  },
});
