import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "list-created",
  title: "List Created",
  event: "list.created",
  noun: "list",
  sampleBody: { "id": 26, "name": "Deal pipeline", "type": 8, "public": false },
});
