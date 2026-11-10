import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "field-value-deleted",
  title: "Field Value Deleted",
  event: "field_value.deleted",
  noun: "field value",
  sampleBody: { "id": 9001, "field_id": 101, "entity_id": 38706, "value": "Active" },
});
