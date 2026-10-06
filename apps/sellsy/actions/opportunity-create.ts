import { writeAction } from "../lib/actions.ts";

export default writeAction({
  "key": "opportunity",
  "noun": "opportunity",
  "path": "/opportunities",
  "scope": "opportunities.write",
  "resultKey": "opportunity",
  "mode": "create",
  "description":
    "Create an opportunity in a pipeline step, linked to one company or individual. Needs the `opportunities.write` scope.",
  "fields": [
    {
      "key": "name",
      "label": "Name",
      "required": true,
    },
    {
      "key": "pipeline",
      "label": "Pipeline ID",
      "as": "int",
      "required": true,
      "hint": "From List Opportunity Pipelines.",
    },
    {
      "key": "step",
      "label": "Step ID",
      "as": "int",
      "required": true,
      "hint": "A step of that pipeline.",
    },
    {
      "key": "related",
      "label": "Related (JSON)",
      "as": "json",
      "required": true,
      "hint":
        'Exactly one company or individual, optionally contacts: [{"id": 12, "type": "company"}].',
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
      "key": "amount",
      "label": "Amount",
      "hint": "Decimal string, e.g. 1500.00.",
    },
    {
      "key": "probability",
      "label": "Probability (%)",
      "as": "int",
    },
    {
      "key": "source",
      "label": "Source ID",
      "as": "int",
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
    {
      "key": "assigned_staff_ids",
      "label": "Assigned staff IDs",
      "as": "intList",
      "hint": "Comma-separated.",
    },
    {
      "key": "contact_ids",
      "label": "Contact IDs",
      "as": "intList",
      "hint": "Comma-separated.",
    },
  ],
});
