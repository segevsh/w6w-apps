import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "list-organizations",
  resource: "organization",
  title: "List Organizations",
  description: "List the organizations the user is a member of (GET /v1/organizations).",
  params: [],
  path: () => "/organizations",
});
