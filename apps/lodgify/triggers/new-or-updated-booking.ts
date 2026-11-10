import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listBookings from "../actions/list-bookings.ts";

export default pollFromListAction({
  key: "new-or-updated-booking",
  title: "New or Updated Booking",
  description: "The run gets each new or updated booking.",
  action: listBookings as ActionDefinition,
  input: (_params) => ({ page: 1, size: 100, updatedSince: "1970-01-01T00:00:00Z" }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (item) =>
    String((item as { id?: unknown; updated_at?: unknown }).id ?? "") + ":" +
    String((item as { updated_at?: unknown }).updated_at ?? ""),

  output: [{ key: "id", type: "string", label: "New Booking ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});
