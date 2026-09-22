/**
 * `GET /api/v2/instructors/{id}` — one instructor.
 *
 * `name`, `picture_url` and `description` are the public profile the customer
 * app shows. `staff` is the id of the linked staff record, so a workflow can
 * join the teaching profile to the account that can actually log in;
 * `permissions` is the profile's own permission object, returned as TeamUp
 * sends it, and `availability_schedules` is when the instructor is free.
 *
 * `icalendar_links` are the calendar feeds published for this instructor —
 * useful for feeding a workflow's own calendar, and worth knowing about before
 * building a subscription from the event endpoints instead.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery, idParam } from "../lib/params.ts";
import { instructorOutput } from "../lib/outputs.ts";

interface Input extends CommonInput {
  id: number;
}

const action: ActionDefinition<Input> = {
  key: "instructors-get",
  type: "read",
  resource: "instructor",
  title: "Get Instructor",
  description:
    "Fetch one instructor by id: the public profile, its linked staff record, permissions and " +
    "availability (GET /api/v2/instructors/{id}).",
  params: [
    idParam("The instructor `id` from List Instructors."),
    ...commonParams(),
  ],
  output: instructorOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request(`/instructors/${input.id}`, {
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
