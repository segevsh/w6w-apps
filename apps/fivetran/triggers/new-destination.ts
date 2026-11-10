import { snapshotTrigger } from "../lib/polls.ts";
import destinationList from "../actions/destination-list.ts";

/**
 * `GET /v1/destinations` (`destination-list`). A group IS a destination (same object, same id —
 * the `group-list` action says so), so this one trigger backs both lists; `group-list` is `covers`.
 */
const newDestination = snapshotTrigger({
  key: "new-destination",
  title: "New Destination",
  description:
    "The run gets each Fivetran destination (warehouse) newly added to the account, with its service and region.",
  action: destinationList,
  listKey: "destinations",
  output: [
    { key: "id", type: "string", label: "Destination (group) ID" },
    { key: "service", type: "string", label: "Destination type" },
    { key: "region", type: "string", label: "Region" },
    { key: "group_id", type: "string", label: "Group ID" },
  ],
  sample: {
    id: "projected_sickle",
    service: "snowflake",
    region: "US",
    group_id: "projected_sickle",
  },
});

export default newDestination;
