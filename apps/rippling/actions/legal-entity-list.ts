import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "legal-entity-list",
  resource: "legal-entity",
  title: "List Legal Entities",
  description: "Legal entities the company employs through. Returns one page, forward-paginated.",
  path: "/legal-entities/",
  scope: "legal-entities.read",
  filterable: [],
  expandable: ["parent", "company"],
  sortable: ["id", "created_at", "updated_at"],
});
