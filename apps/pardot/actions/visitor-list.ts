import { queryAction } from "../lib/query.ts";

export default queryAction({
  key: "visitor-list",
  title: "List Visitors",
  description: "Query tracked website visitors, identified or not.",
  path: "visitors",
  resource: "visitor",
  defaultFields: "id,prospectId,campaignId,hostname,pageViewCount,isIdentified,createdAt,updatedAt",
  orderBy: ["id", "prospectId", "createdAt", "updatedAt"],
  filters: [
    { key: "prospectId", label: "Prospect ID", type: "number" },
    {
      key: "isIdentified",
      label: "Identified only",
      type: "boolean",
      hint: "When true, only visitors whose company is identified.",
    },
    { key: "idList", label: "ID list", type: "string", hint: "Comma-separated ids." },
  ],
});
