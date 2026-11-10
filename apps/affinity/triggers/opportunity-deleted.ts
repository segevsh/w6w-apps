import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "opportunity-deleted",
  title: "Opportunity Deleted",
  event: "opportunity.deleted",
  noun: "opportunity",
  sampleBody: { "id": 4100, "name": "Series A", "list_id": 26 },
});
