import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "list-deleted",
  title: "List Deleted",
  event: "list.deleted",
  noun: "list",
  sampleBody: { "id": 26, "name": "Deal pipeline", "type": 8, "public": false },
});
