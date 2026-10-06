import { queryAction } from "../lib/query.ts";

export default queryAction({
  key: "prospect-list",
  title: "List Prospects",
  description:
    "Query prospects with filters on id, email, Salesforce id, timestamps and owner. Returns one page plus a token for the next.",
  path: "prospects",
  resource: "prospect",
  defaultFields: "id,email,firstName,lastName,company,score,campaignId,lastActivityAt",
  orderBy: ["id", "lastActivityAt", "createdAt", "updatedAt"],
  filters: [
    { key: "email", label: "Email", type: "string", hint: "Exact match." },
    { key: "salesforceId", label: "Salesforce ID", type: "string" },
    { key: "idList", label: "ID list", type: "string", hint: "Comma-separated prospect ids." },
    { key: "idGreaterThan", label: "ID greater than", type: "number" },
    { key: "idLessThan", label: "ID less than", type: "number" },
    { key: "userId", label: "Assigned user ID", type: "number" },
    {
      key: "createdAtAfter",
      label: "Created after",
      type: "string",
      placeholder: "2026-01-01T00:00:00-05:00",
      hint: "ISO 8601 with a time-zone offset. Non-inclusive.",
    },
    { key: "createdAtBefore", label: "Created before", type: "string" },
    {
      key: "updatedAtAfter",
      label: "Updated after",
      type: "string",
      hint: "ISO 8601 with offset. The usual cursor for an incremental sync.",
    },
    { key: "updatedAtBefore", label: "Updated before", type: "string" },
    { key: "lastActivityAtAfter", label: "Last activity after", type: "string" },
    { key: "lastActivityAtBefore", label: "Last activity before", type: "string" },
  ],
});
