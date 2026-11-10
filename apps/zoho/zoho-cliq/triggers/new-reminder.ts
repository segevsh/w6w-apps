import reminderList from "../actions/reminder-list.ts";
import { drainPages, snapshotTrigger, str } from "../lib/triggers.ts";

/**
 * `GET /api/v2/reminders?category=<c>&limit=100[&next_set_token=…]` through `reminder-list`: pages
 * continued with `next_set_token`, no documented order (https://www.zoho.com/cliq/help/restapi/v2/,
 * "Reminders"), so every page of the chosen category is read and snapshot-diffed (additions only;
 * more than 50 pages throws).
 */
export default snapshotTrigger({
  key: "new-reminder",
  title: "New Reminder",
  description: "The run gets each reminder that appears in the chosen category.",
  params: [{
    key: "category",
    label: "Category",
    type: "select",
    default: "mine",
    options: [
      { value: "mine", label: "Mine" },
      { value: "mine-completed", label: "Mine (completed)" },
      { value: "others", label: "Assigned to others" },
      { value: "others-completed", label: "Assigned to others (completed)" },
    ],
  }],
  output: [
    { key: "id", type: "string", label: "Reminder ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "completed", type: "boolean", label: "Completed" },
    { key: "creation_time", type: "number", label: "Created at (epoch ms)" },
    { key: "time", type: "number", label: "Due at (epoch ms)" },
  ],
  sample: {
    id: "11360000000204033",
    content: "Annual sales review report due tomorrow",
    completed: false,
    creation_time: 1506398400000,
    time: 1506571200000,
  },
  rows: (params, ctx) =>
    drainPages(async (nextSetToken) => {
      const out = await reminderList.execute({
        category: str(params.category) || "mine",
        limit: 100,
        nextSetToken,
      }, ctx);
      return {
        items: out.reminders,
        next: out.nextSetToken === undefined || out.nextSetToken === null
          ? undefined
          : String(out.nextSetToken),
      };
    }),
  idOf: (item) => str((item as { id?: unknown }).id),
});
