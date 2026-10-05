import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "custom-field-list",
  resource: "custom-field",
  title: "List Custom Fields",
  description:
    "The company's custom field definitions (the fields admins add to worker profiles). Returns one page, forward-paginated.",
  path: "/custom-fields/",
  scope: "custom-fields.read",
});
