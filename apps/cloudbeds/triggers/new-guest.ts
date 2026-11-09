import { pollFromListAction } from "../../_shared/poll/mod.ts";
import guestList from "../actions/guest-list.ts";

export default pollFromListAction({
  key: "new-guest",
  title: "New Guest",
  description: "The run gets each newly created guest.",
  action: guestList,
  input: () => ({ sortBy: "creation", pageNumber: 1, pageSize: 100 }),
  items: (result) => Object.values((result as { data?: Record<string, unknown> }).data ?? {}),
  idOf: (item) =>
    String(
      (item as { guestID?: unknown; id?: unknown }).guestID ?? (item as { id?: unknown }).id ?? "",
    ),
  output: [{ key: "guestID", type: "string", label: "Guest ID" }],
  sample: { guestID: "guest-1" },
  maxPages: 1,
});
