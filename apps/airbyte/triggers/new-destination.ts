import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/destination-list.ts";

export default pollFromListAction({
  key: "new-destination",
  title: "New Destination",
  description: "The run gets each newly created destination.",
  action,
  input: () => ({ limit: 1000, offset: 0 }),
  items: (result) => (result as { destinations?: unknown[] }).destinations ?? [],
  idOf: (item) => String((item as { destinationId?: unknown }).destinationId ?? ""),
  output: [{ key: "destinationId", type: "string", label: "Destination ID" }],
  sample: { destinationId: "destination-101" },
  maxPages: 1,
});
