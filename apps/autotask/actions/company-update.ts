import { writeAction } from "../lib/factory.ts";

/** `PATCH /Companies` — change only the fields sent. */
export default writeAction({
  key: "company-update",
  title: "Update company",
  description: "Change the fields you send on a company (PATCH — everything else is left alone).",
  resource: "company",
  method: "PATCH",
  path: "/Companies",
  fields: [
    { key: "companyName", label: "Company name", type: "string" },
    { key: "companyType", label: "Company type (picklist id)", type: "number" },
    { key: "ownerResourceID", label: "Owner resource ID", type: "number" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "address1", label: "Address line 1", type: "string" },
    { key: "address2", label: "Address line 2", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "postalCode", label: "Postal code", type: "string" },
    { key: "countryID", label: "Country ID", type: "number" },
    { key: "webAddress", label: "Web address", type: "string" },
    { key: "companyNumber", label: "Company number", type: "string" },
    { key: "classification", label: "Classification (picklist id)", type: "number" },
    { key: "companyCategoryID", label: "Company category ID", type: "number" },
    { key: "parentCompanyID", label: "Parent company ID", type: "number" },
    { key: "isActive", label: "Active", type: "boolean" },
  ],
});
