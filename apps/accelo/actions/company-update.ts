import { updateAction } from "../lib/actions.ts";

export default updateAction({
  key: "company-update",
  resource: "company",
  path: "/companies",
  idKey: "companyId",
  idLabel: "Company ID",
  title: "Update Company",
  description:
    "Change a company's name, website, phone, fax or comments. Unset fields are left alone.",
  fields: [
    { key: "name", wire: "name", label: "Name" },
    { key: "website", wire: "website", label: "Website", row: "contact" },
    { key: "phone", wire: "phone", label: "Phone", row: "contact" },
    { key: "fax", wire: "fax", label: "Fax", row: "contact", advanced: true },
    { key: "comments", wire: "comments", label: "Comments", type: "text" },
  ],
});
