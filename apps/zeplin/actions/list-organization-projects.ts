import { listAction, organizationIdParam, organizationPath } from "../lib/actions.ts";

export default listAction({
  key: "list-organization-projects",
  resource: "project",
  title: "List Organization Projects",
  description:
    "List the projects that belong to an organization (GET /v1/organizations/{organization_id}/projects).",
  params: [organizationIdParam],
  path: (i) => `${organizationPath(i)}/projects`,
});
