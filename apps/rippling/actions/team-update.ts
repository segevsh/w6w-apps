import { updateAction } from "../lib/actions.ts";

export default updateAction({
  key: "team-update",
  resource: "team",
  title: "Update Team",
  description: "Update a team.",
  path: "/teams",
  scope: "teams.read-write",
  fields: [
    { wire: "name", param: { key: "name", label: "Name", type: "string" } },
    { wire: "parent_id", param: { key: "parentId", label: "Parent team ID", type: "string" } },
  ],
});
