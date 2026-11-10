import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "field-value-updated",
  title: "Field Value Updated",
  event: "field_value.updated",
  noun: "field value",
  sampleBody: { "id": 9001, "field_id": 101, "entity_id": 38706, "value": "Active" },
});
