import companiesList from "../actions/companies-list.ts";
import { orgWindowTrigger } from "../lib/org-window.ts";

export default orgWindowTrigger({
  key: "new-company",
  title: "New Company",
  description: "The run gets each company your organization researches, since the last check.",
  action: companiesList,
  idField: "companyId",
  output: [
    { key: "companyId", type: "string", label: "Company ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "domain", type: "string", label: "Domain" },
    { key: "researchedAt", type: "string", label: "Researched at" },
  ],
  sample: {
    companyId: "7731",
    name: "Acme",
    domain: "acme.example",
    researchedAt: "2026-11-10T09:00:00.000Z",
  },
});
