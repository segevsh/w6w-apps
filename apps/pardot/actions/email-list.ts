import { idFilters, timeFilters } from "../lib/filters.ts";
import { queryAction } from "../lib/query.ts";

export default queryAction({
  key: "email-list",
  title: "List Emails",
  description:
    "Query sent emails. `htmlMessage` and `textMessage` are not queryable — read a single email for those.",
  path: "emails",
  resource: "email",
  defaultFields: "id,name,subject,campaignId,sentAt,type",
  orderBy: ["id"],
  supportsDeleted: false,
  filters: [
    {
      key: "prospectId",
      label: "Prospect ID",
      type: "number",
      hint: "Emails sent to this prospect.",
    },
    { key: "listEmailId", label: "List email ID", type: "number" },
    ...idFilters,
    ...timeFilters("sentAt"),
  ],
});
