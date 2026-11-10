import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/backup-list.ts";

/** `GET /backups` is documented "Sorted by date (new first)" (https://developer.raindrop.io/v1/backups). */
export default pollFromListAction({
  key: "new-backup",
  title: "New Backup",
  description: "The run gets each backup newly created for the account.",
  action: action as never,
  input: () => ({}),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  output: [
    { key: "_id", type: "string", label: "Backup ID" },
    { key: "created", type: "string", label: "Created at" },
  ],
  sample: { _id: "659d42a35ffbb2eb5ae1cb86", created: "2026-11-10T09:00:00.000Z" },
  minIntervalMs: 300_000,
  maxPages: 1,
});
