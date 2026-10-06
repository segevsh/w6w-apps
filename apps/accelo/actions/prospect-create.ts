import { createAction } from "../lib/actions.ts";

export default createAction({
  key: "prospect-create",
  resource: "prospect",
  path: "/prospects",
  title: "Create Prospect",
  description: "Create a prospect (sales opportunity) for an affiliation.",
  fields: [
    { key: "title", wire: "title", label: "Title", required: true },
    {
      key: "affiliationId",
      wire: "affiliation_id",
      label: "Affiliation ID",
      type: "number",
      required: true,
    },
    { key: "typeId", wire: "type_id", label: "Prospect type ID", type: "number", required: true },
    {
      key: "statusId",
      wire: "status_id",
      label: "Status ID",
      type: "number",
      advanced: true,
      hint: "Defaults to the first status. Skips progressions.",
    },
    { key: "value", wire: "value", label: "Value", type: "number", advanced: true, row: "worth" },
    {
      key: "weighting",
      wire: "weighting",
      label: "Weighting (0-5)",
      type: "number",
      advanced: true,
      row: "worth",
    },
    {
      key: "progress",
      wire: "progress",
      label: "Progress (0-100)",
      type: "number",
      advanced: true,
      row: "worth",
    },
    { key: "comments", wire: "comments", label: "Comments", type: "text", advanced: true },
  ],
});
