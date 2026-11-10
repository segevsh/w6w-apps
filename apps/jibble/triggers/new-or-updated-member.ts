import type { ActionDefinition } from "@w6w/types";
import { idOfRevision, odataFeed } from "../lib/triggers.ts";
import memberList from "../actions/member-list.ts";

/** OData `$orderby` newest-first; `createdAt`/`updatedAt` are on the entity ($metadata, verified 2026-11-10). */
export default odataFeed({
  key: "new-or-updated-member",
  title: "New or Updated Member",
  description: "The run gets each person who was added or edited, with the new field values.",
  action: memberList as ActionDefinition,
  orderBy: "updatedAt desc",
  idOf: idOfRevision,
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "fullName", type: "string", label: "Full name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "Role" },
    { key: "status", type: "string", label: "Status" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "person-1",
    fullName: "Dana Rivera",
    email: "dana@example.com",
    role: "Member",
    status: "Joined",
    createdAt: "2026-11-09T09:00:00Z",
    updatedAt: "2026-11-10T09:00:00Z",
  },
});
