import { pollFromListAction } from "../../_shared/poll/mod.ts";
import visitorCompanyList from "../actions/visitor-company-list.ts";
import { utcDate } from "../lib/triggers.ts";
import { accountIdParam } from "../lib/params.ts";

/**
 * `GET /v1/web-visits/companies` over yesterday-to-today. The vendor documents that without a
 * `sort[...]` parameter "the companies that visited most recently come first" (openapi.yaml,
 * getWebVisitsCompanies), so page 1 is the latest visitors and a company id not seen before is new.
 */
export default pollFromListAction<{ accountId: string; customFeedId?: string }>({
  key: "new-visitor-company",
  title: "New Visitor Company",
  description: "The run gets each company that newly visits your website.",
  action: visitorCompanyList as never,
  params: [
    accountIdParam,
    {
      key: "customFeedId",
      label: "Custom feed ID",
      type: "string",
      hint: "Only companies matching this custom feed (see List Custom Feeds).",
    },
  ],
  input: (params) => ({
    accountId: params.accountId,
    customFeedId: params.customFeedId || undefined,
    startDate: utcDate(1),
    endDate: utcDate(0),
    pageSize: 100,
  }),
  items: (result) => {
    const data = (result as { data?: unknown }).data;
    return Array.isArray(data) ? data : [];
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Visitor company ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "relationships", type: "object", label: "Company and location references" },
  ],
  sample: {
    id: "5b4f313e-46de-11e8-b981-05bebed8e58b",
    type: "company_location",
    relationships: { company: { id: "129011", type: "company" } },
  },
  maxPages: 1,
});
