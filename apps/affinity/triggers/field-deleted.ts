import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "field-deleted",
  title: "Field Deleted",
  event: "field.deleted",
  noun: "field",
  sampleBody: { "id": 101, "name": "Stage", "list_id": 26, "value_type": 7 },
});
