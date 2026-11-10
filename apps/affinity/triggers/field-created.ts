import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "field-created",
  title: "Field Created",
  event: "field.created",
  noun: "field",
  sampleBody: { "id": 101, "name": "Stage", "list_id": 26, "value_type": 7 },
});
