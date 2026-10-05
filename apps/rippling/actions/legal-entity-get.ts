import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "legal-entity-get",
  resource: "legal-entity",
  title: "Get Legal Entity",
  description: "Retrieve one legal entity by id.",
  path: "/legal-entities",
  scope: "legal-entities.read",
  expandable: ["parent", "company"],
});
