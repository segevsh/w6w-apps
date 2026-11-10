import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "list-updated",
  title: "List Updated",
  event: "list.updated",
  noun: "list",
  sampleBody: { "id": 26, "name": "Deal pipeline", "type": 8, "public": false },
});
