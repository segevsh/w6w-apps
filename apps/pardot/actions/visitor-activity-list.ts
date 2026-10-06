import { idFilters, timeFilters } from "../lib/filters.ts";
import { queryAction } from "../lib/query.ts";

export default queryAction({
  key: "visitor-activity-list",
  title: "List Visitor Activities",
  description:
    "Query what visitors and prospects did: clicks, views, form and form-handler submissions, email opens and sends, and more. `typeName` says which.",
  path: "visitor-activities",
  resource: "visitor-activity",
  defaultFields: "id,type,typeName,details,prospectId,visitorId,campaignId,createdAt",
  orderBy: ["id", "createdAt", "updatedAt"],
  supportsDeleted: false,
  filters: [
    {
      key: "type",
      label: "Activity type",
      type: "number",
      hint:
        "Numeric type: 1 click, 2 view, 3 error, 4 success, 6 email sent, 11 email open, 20 visit.",
    },
    { key: "prospectId", label: "Prospect ID", type: "number" },
    { key: "visitorId", label: "Visitor ID", type: "number" },
    ...idFilters,
    ...timeFilters("createdAt"),
    ...timeFilters("updatedAt"),
  ],
});
