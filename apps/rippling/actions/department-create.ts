import { createAction } from "../lib/actions.ts";

export default createAction({
  key: "department-create",
  resource: "department",
  title: "Create Department",
  description: "Create a department.",
  path: "/departments",
  scope: "departments.read-write",
  fields: [
    { wire: "name", param: { key: "name", label: "Name", type: "string", required: true } },
    {
      wire: "parent_id",
      param: {
        key: "parentId",
        label: "Parent department ID",
        type: "string",
        hint: "Nest this department under another one.",
      },
    },
    {
      wire: "reference_code",
      param: {
        key: "referenceCode",
        label: "Reference code",
        type: "string",
        hint: "Your own code for the department, e.g. a cost-centre id.",
      },
    },
  ],
});
