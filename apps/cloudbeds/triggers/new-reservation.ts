import type { TriggerDefinition } from "@w6w/types";
import { reservationOutput, reservationPoll, reservationSample } from "../lib/triggers.ts";

/** Fires on reservations booked since the last check (`reservation-list` with `resultsFrom`). */
const trigger: TriggerDefinition = reservationPoll({
  key: "new-reservation",
  title: "New Reservation",
  description: "The run gets each reservation booked since the last check.",
  filter: "resultsFrom",
  idOf: (r) => String(r.reservationID ?? ""),
  output: [...reservationOutput],
  sample: reservationSample,
});

export default trigger;
