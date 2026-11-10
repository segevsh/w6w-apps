import opportunityList from "../actions/opportunity-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each Keap opportunity that is new or was edited (`GET /rest/v2/opportunities`, `order_by=update_time desc`; an edit is a new event). Brief 9.1 (a), 9.2. */
export default feedTrigger({
  key: "new-or-updated-opportunity",
  title: "New or Updated Opportunity",
  description:
    "The run gets each Keap opportunity that is new or was edited (`GET /rest/v2/opportunities`, `order_by=update_time desc`; an edit is a new event).",
  action: opportunityList,
  list: "opportunities",
  orderBy: "update_time desc",
  stamp: "last_updated_time",
  output: [{ key: "id", type: "string", label: "ID" }, {
    key: "opportunity_title",
    type: "string",
    label: "Title",
  }, { key: "last_updated_time", type: "string", label: "Updated at" }],
  sample: {
    id: "1",
    opportunity_title: "Website redesign",
    last_updated_time: "2026-11-10T12:30:00.000Z",
  },
});
