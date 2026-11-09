import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listReservations from "../actions/list-reservations.ts";

export default pollFromListAction({
  key: "new-reservation",
  title: "New Reservation",
  description: "Fires when Hostaway records a new or recently active reservation.",
  action: listReservations,
  input: () => ({ limit: 100, offset: 0, sortOrder: "latestActivityDesc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Reservation ID" }],
  sample: { id: "reservation_123" },
});
