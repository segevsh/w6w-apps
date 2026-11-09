import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/meeting-event-list.ts";

const trigger = pollFromListAction({
  key: "new-meeting-event",
  title: "New Meeting Event",
  description: "Fires for newly created meeting events.",
  action,
  input: () => ({ page: 1, items: 100, order: "created_at desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { uuid?: unknown }).uuid),
  output: [{ key: "uuid", type: "string", label: "Meeting event UUID" }],
  sample: { uuid: "meeting-1" },
  maxPages: 1,
});

export default trigger;
