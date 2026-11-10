import type { TriggerDefinition } from "@w6w/types";
import { reservationOutput, reservationPoll, reservationSample } from "../lib/triggers.ts";

/** Fires on reservations created or modified since the last check (`modifiedFrom`). */
const trigger: TriggerDefinition = reservationPoll({
  key: "new-or-updated-reservation",
  title: "New or Updated Reservation",
  description: "The run gets each reservation that was booked or modified since the last check.",
  filter: "modifiedFrom",
  idOf: (r) => `${r.reservationID ?? ""}:${r.dateModified ?? ""}`,
  output: [...reservationOutput],
  sample: reservationSample,
});

export default trigger;
