import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listBookings from "../actions/list-bookings.ts";

export default pollFromListAction({
  key: "new-booking",
  title: "New Booking",
  description: "The run gets each newly created booking.",
  action: listBookings as ActionDefinition,
  input: (_params) => ({ page: 1, size: 100, updatedSince: "1970-01-01T00:00:00Z" }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),

  output: [{ key: "id", type: "string", label: "New Booking ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});
