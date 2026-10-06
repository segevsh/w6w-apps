import { type Input, listAction, optionalIdParam, scopedPath } from "../lib/factory.ts";

const PARENT = { key: "eventId", base: "/events" };

export default listAction({
  key: "attendance-list",
  resource: "attendance",
  title: "List Attendances",
  description:
    "List attendances: people who RSVPed to an event. Scope by event or by person. Give exactly one of the two.",
  params: [
    optionalIdParam("eventId", "Event ID"),
    optionalIdParam("personId", "Person ID", "List this person's attendances instead."),
  ],
  path: (i: Input) => scopedPath(i, PARENT, "attendances"),
  filterFields: "identifier, created_date, modified_date",
});
