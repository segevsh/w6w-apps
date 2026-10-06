import { writeAction } from "../lib/actions.ts";

export default writeAction({
  "key": "task",
  "noun": "task",
  "path": "/tasks",
  "scope": "tasks.write",
  "resultKey": "task",
  "mode": "create",
  "fields": [
    {
      "key": "title",
      "label": "Title",
    },
    {
      "key": "description",
      "label": "Description",
    },
    {
      "key": "due_date",
      "label": "Due date",
      "hint": "ISO 8601.",
      "required": true,
    },
    {
      "key": "label_id",
      "label": "Label ID",
      "as": "int",
      "hint": "From List Task Labels.",
      "required": true,
    },
    {
      "key": "status",
      "label": "Status",
      "options": [
        "todo",
        "done",
      ],
    },
    {
      "key": "assigned_staff_ids",
      "label": "Assigned staff IDs",
      "as": "intList",
      "hint": "Comma-separated.",
    },
    {
      "key": "related",
      "label": "Related object (JSON)",
      "as": "json",
      "hint": 'At most one: [{"type": "company", "id": 12}].',
    },
    {
      "key": "is_private",
      "label": "Private",
      "as": "bool",
    },
    {
      "key": "priority",
      "label": "Priority",
      "as": "int",
    },
  ],
});
