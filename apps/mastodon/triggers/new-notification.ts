import { pollFromListAction } from "../../_shared/poll/mod.ts";
import notificationList from "../actions/notification-list.ts";

export default pollFromListAction({
  key: "new-notification",
  title: "New Notification",
  description: "The run gets each new Mastodon notification.",
  action: notificationList,
  input: () => ({ limit: 40, minId: "" }),
  items: (result) => (result as { notifications?: unknown[] }).notifications ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Notification ID" }],
  sample: { id: "113000000000000001", type: "mention" },
  maxPages: 1,
});
