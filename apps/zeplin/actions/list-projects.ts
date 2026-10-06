import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "list-projects",
  resource: "project",
  title: "List Projects",
  description: "List the projects the user is a member of (GET /v1/projects).",
  params: [
    {
      key: "workspace",
      label: "Workspace",
      type: "string",
      placeholder: "personal",
      hint: "`personal`, or an organization id. Empty lists every workspace.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "archived", label: "Archived" },
      ],
    },
  ],
  path: () => "/projects",
  query: (i) => ({
    workspace: String(i.workspace ?? "").trim() || undefined,
    status: String(i.status ?? "").trim() || undefined,
  }),
});
