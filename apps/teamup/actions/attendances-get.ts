/**
 * `GET /api/v2/attendances/{id}` — one attendance.
 *
 * The status vocabulary is the reason this action exists:
 * `not_registered`/`registered`/`attended`/`no_show`/`late_cancelled`.
 * `no_show` is written by the business (or by TeamUp's own attendance flow)
 * rather than by a booking call, which is what makes it the field a follow-up
 * workflow filters on.
 *
 * The rest of the shape links the two sides of the booking: `customer`,
 * `event`, the `customer_membership` that paid for it, `booking_source` for how
 * the booking arrived, `gympass_booking` when it came in through Gympass, and
 * `waitlist_spot` when it came off the waiting list. `is_late_cancel` on
 * `events-unregister` is what produces the `late_cancelled` status read here.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery, idParam } from "../lib/params.ts";
import { attendanceOutput } from "../lib/outputs.ts";

interface Input extends CommonInput {
  id: number;
}

const action: ActionDefinition<Input> = {
  key: "attendances-get",
  type: "read",
  resource: "attendance",
  title: "Get Attendance",
  description:
    "Fetch one attendance by id: the customer, the event, the status and the membership that paid " +
    "(GET /api/v2/attendances/{id}).",
  params: [
    idParam("The attendance `id` returned by Register for Event."),
    ...commonParams(),
  ],
  output: attendanceOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request(`/attendances/${input.id}`, {
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
