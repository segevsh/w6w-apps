import { writeAction } from "../lib/factory.ts";

/**
 * `POST /Companies` — create a company (an Autotask "organization").
 *
 * The vendor's Companies page marks `companyName`, `companyType` (picklist), `ownerResourceID`
 * and `phone` required. `currencyID` can be set at creation and is read-only afterwards.
 */
export default writeAction({
  key: "company-create",
  title: "Create company",
  description:
    "Create a company. `companyType` is a picklist id and `ownerResourceID` the account " +
    "manager's resource id; `phone` is required by the vendor's entity page.",
  resource: "company",
  method: "POST",
  path: "/Companies",
  fields: [
    { key: "companyName", label: "Company name", type: "string", required: true },
    { key: "companyType", label: "Company type (picklist id)", type: "number", required: true },
    { key: "ownerResourceID", label: "Owner resource ID", type: "number", required: true },
    { key: "phone", label: "Phone", type: "string", required: true },
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
