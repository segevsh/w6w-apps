import { createAction } from "../lib/actions.ts";

export default createAction({
  key: "team-create",
  resource: "team",
  title: "Create Team",
  description: "Create a team.",
  path: "/teams",
  scope: "teams.read-write",
  fields: [
    { wire: "name", param: { key: "name", label: "Name", type: "string", required: true } },
    {
      wire: "parent_id",
      param: {
        key: "parentId",
        label: "Parent team ID",
        type: "string",
        hint: "Nest this team under another one.",
      },
    },
  ],
});
