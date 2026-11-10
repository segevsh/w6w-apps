import opportunityList from "../actions/opportunity-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each new Keap opportunity, newest first (`GET /rest/v2/opportunities`, `order_by=created_time desc`). Brief 9.1 (a). */
export default feedTrigger({
  key: "new-opportunity",
  title: "New Opportunity",
  description:
    "The run gets each new Keap opportunity, newest first (`GET /rest/v2/opportunities`, `order_by=created_time desc`).",
  action: opportunityList,
  list: "opportunities",
  orderBy: "created_time desc",
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "opportunity_title", type: "string", label: "Title" },
    { key: "created_time", type: "string", label: "Created at" },
    { key: "last_updated_time", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "1",
    opportunity_title: "Website redesign",
    created_time: "2026-11-10T12:00:00.000Z",
    last_updated_time: "2026-11-10T12:00:00.000Z",
  },
});
