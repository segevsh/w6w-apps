import { snapshotTrigger } from "../lib/triggers.ts";
import listChannelCategories from "../actions/list-channel-categories.ts";

/**
 * `GET /v0/channelCategories` returns every category in one unpaged response
 * (https://heartbeat.readme.io/reference/getchannelcategories), one community's own categories (bounded; the kit caps a snapshot at 5000 rows), so each
 * check diffs the ids against the previous one (`pollSnapshot`, added only).
 */
export default snapshotTrigger({
  key: "new-channel-category",
  title: "New Channel Category",
  description: "The run gets each newly created channel category of the Heartbeat community.",
  action: listChannelCategories,
  field: "channelCategories",
  output: [
    { key: "id", type: "string", label: "Category ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "5dbcf5c9-5e7e-4285-9dab-6d3ce7f4dd1e", name: "Community" },
});
