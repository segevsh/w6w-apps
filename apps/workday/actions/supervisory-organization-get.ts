import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "supervisory-organization-get",
  resource: "organization",
  title: "Get a supervisory organization",
  description:
    "One supervisory organization by ID. Staffing service v7 `GET /supervisoryOrganizations/{ID}`.",
  service: "staffing",
  path: "/supervisoryOrganizations/{ID}",
  idKey: "organizationId",
  idLabel: "Organization ID",
  idHint: "A 32-character Workday ID or a reference ID. Take the `id` from a list.",
});
