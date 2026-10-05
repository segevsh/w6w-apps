import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "supervisory-organization-list",
  resource: "organization",
  title: "List supervisory organizations",
  description:
    "Supervisory organizations with code, name, managers and active state. Active only unless " +
    "`includeInactive` is set. Staffing service v7 `GET /supervisoryOrganizations`.",
  service: "staffing",
  path: "/supervisoryOrganizations",
  params: [{ key: "includeInactive", label: "Include inactive", type: "boolean" }],
  query: (i) => ({ includeInactive: i.includeInactive as boolean | undefined }),
});
