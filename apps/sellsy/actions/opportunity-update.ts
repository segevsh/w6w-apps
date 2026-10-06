import { writeAction } from "../lib/actions.ts";

export default writeAction({
  "key": "opportunity",
  "noun": "opportunity",
  "path": "/opportunities",
  "scope": "opportunities.write",
  "resultKey": "opportunity",
  "mode": "update",
  "method": "PATCH",
  "description":
    "Patch an opportunity (PATCH — only the fields you set change). Needs the `opportunities.write` scope.",
  "fields": [
    {
      "key": "name",
      "label": "Name",
    },
    {
      "key": "status",
      "label": "Status",
      "options": [
        "open",
        "won",
        "lost",
        "cancelled",
        "closed",
        "late",
      ],
    },
    {
      "key": "pipeline",
      "label": "Pipeline ID",
      "as": "int",
    },
    {
      "key": "step",
      "label": "Step ID",
      "as": "int",
    },
    {
      "key": "amount",
      "label": "Amount",
      "as": "number",
      "type": "number",
    },
    {
      "key": "probability",
      "label": "Probability (%)",
      "as": "number",
      "type": "number",
    },
    {
      "key": "due_date",
      "label": "Due date",
      "hint": "ISO 8601.",
    },
    {
      "key": "note",
      "label": "Note",
    },
    {
      "key": "owner_id",
      "label": "Owner (staff ID)",
      "as": "int",
    },
  ],
});
