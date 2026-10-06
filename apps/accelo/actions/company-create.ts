import { createAction } from "../lib/actions.ts";

export default createAction({
  key: "company-create",
  resource: "company",
  path: "/companies",
  title: "Create Company",
  description: "Create a company and return it.",
  fields: [
    { key: "name", wire: "name", label: "Name", required: true },
    { key: "website", wire: "website", label: "Website", row: "contact" },
    { key: "phone", wire: "phone", label: "Phone", row: "contact" },
    { key: "fax", wire: "fax", label: "Fax", row: "contact", advanced: true },
    { key: "comments", wire: "comments", label: "Comments", type: "text" },
    {
      key: "standing",
      wire: "standing",
      label: "Standing",
      advanced: true,
      row: "status",
      hint: "E.g. `active`. Overwrites a `statusId` if both are sent.",
    },
    {
      key: "statusId",
      wire: "status_id",
      label: "Status ID",
      type: "number",
      advanced: true,
      row: "status",
    },
    {
      key: "parentId",
      wire: "parent_id",
      label: "Parent company ID",
      type: "number",
      advanced: true,
    },
    {
      key: "customId",
      wire: "custom_id",
      label: "Custom ID",
      advanced: true,
      hint: "Only honoured when custom ids are enabled on the deployment.",
    },
  ],
});
