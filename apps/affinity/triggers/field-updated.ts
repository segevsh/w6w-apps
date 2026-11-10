import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "field-updated",
  title: "Field Updated",
  event: "field.updated",
  noun: "field",
  sampleBody: { "id": 101, "name": "Stage", "list_id": 26, "value_type": 7 },
});
