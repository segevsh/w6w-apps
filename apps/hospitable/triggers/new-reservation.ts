import { pollFromListAction } from "../../_shared/poll/mod.ts";
import reservationList from "../actions/reservation-list.ts";

export default pollFromListAction<{ propertyIds: string }>({
  key: "new-reservation",
  title: "New Reservation",
  description: "The run gets each newly booked reservation.",
  action: reservationList as never,
  input: (params: { propertyIds: string }) => ({
    property_ids: params.propertyIds,
    sort_by: "booked_at",
    sort_direction: "desc",
    page: 1,
    per_page: 100,
  }),
  params: [{ key: "propertyIds", label: "Property IDs", type: "string", required: true }],
  items: (result) =>
    (result as { items?: unknown[]; data?: unknown[] }).items ??
      (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Reservation ID" }],
  sample: { id: "reservation-1", status: "accepted" },
  maxPages: 1,
});
