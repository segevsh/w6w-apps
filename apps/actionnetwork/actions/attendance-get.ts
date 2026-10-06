import { getAction, idParam, optionalIdParam, scopedItemPath } from "../lib/factory.ts";
import { recordOutput } from "../lib/person.ts";

const PARENT = { key: "eventId", base: "/events" };

export default getAction({
  key: "attendance-get",
  resource: "attendance",
  title: "Get Attendance",
  description:
    "Fetch one attendance by id, under its event or under the person. Give exactly one of the two.",
  params: [
    idParam("attendanceId", "Attendance ID"),
    optionalIdParam("eventId", "Event ID"),
    optionalIdParam("personId", "Person ID"),
  ],
  path: (i) => scopedItemPath(i, PARENT, "attendances", "attendanceId"),
  output: recordOutput(
    {
      key: "status",
      type: "string",
      label: "accepted, attended, declined, tentative or needs action",
    },
  ),
});
