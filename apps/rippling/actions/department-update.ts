import { updateAction } from "../lib/actions.ts";

export default updateAction({
  key: "department-update",
  resource: "department",
  title: "Update Department",
  description: "Update a department.",
  path: "/departments",
  scope: "departments.read-write",
  fields: [
    { wire: "name", param: { key: "name", label: "Name", type: "string" } },
    {
      wire: "parent_id",
      param: { key: "parentId", label: "Parent department ID", type: "string" },
    },
    {
      wire: "reference_code",
      param: { key: "referenceCode", label: "Reference code", type: "string" },
    },
  ],
});
