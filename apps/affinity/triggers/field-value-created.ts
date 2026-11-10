import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "field-value-created",
  title: "Field Value Created",
  event: "field_value.created",
  noun: "field value",
  sampleBody: { "id": 9001, "field_id": 101, "entity_id": 38706, "value": "Active" },
});
