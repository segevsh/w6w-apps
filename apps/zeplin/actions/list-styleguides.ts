import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "list-styleguides",
  resource: "styleguide",
  title: "List Styleguides",
  description:
    "List the styleguides the user is a member of (GET /v1/styleguides). With a linked project or styleguide, lists the styleguides linked to it.",
  params: [
    {
      key: "workspace",
      label: "Workspace",
      type: "string",
      hint: "`personal`, or an organization id.",
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
    { key: "linkedProject", label: "Linked project ID", type: "string" },
    { key: "linkedStyleguide", label: "Linked styleguide ID", type: "string" },
  ],
  path: () => "/styleguides",
  query: (i) => ({
    workspace: String(i.workspace ?? "").trim() || undefined,
    status: String(i.status ?? "").trim() || undefined,
    linked_project: String(i.linkedProject ?? "").trim() || undefined,
    linked_styleguide: String(i.linkedStyleguide ?? "").trim() || undefined,
  }),
});
