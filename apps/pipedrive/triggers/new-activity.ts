import { createdTrigger } from "../lib/triggers.ts";

/** A Pipedrive `create.activity` webhook (registered through the API). */
export default createdTrigger({
  key: "new-activity",
  title: "New Activity",
  description: "Fires when an activity is created. The run gets the new activity.",
  object: "activity",
  output: [
    { key: "id", type: "string", label: "Activity ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "type", type: "string", label: "Type" },
    { key: "due_date", type: "string", label: "Due date" },
    { key: "deal_id", type: "string", label: "Deal ID" },
    { key: "person_id", type: "string", label: "Person ID" },
  ],
  sample: {
    id: "11",
    subject: "Call Ada",
    type: "call",
    due_date: "2026-11-12",
    deal_id: "42",
    person_id: "7",
  },
});
