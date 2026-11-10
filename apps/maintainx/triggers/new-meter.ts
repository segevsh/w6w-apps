import type { ActionDefinition } from "@w6w/types";
import { cursorSnapshot } from "../lib/triggers.ts";
import meterList from "../actions/meter-list.ts";

/** `GET /v1/meters` has no sort or since filter, so it is read through `nextCursor` and diffed by id (added rows only). */
export default cursorSnapshot({
  key: "new-meter",
  title: "New Meter",
  description: "The run gets each newly created meter: id, name, unit and measurement type.",
  action: meterList as ActionDefinition,
  listKey: "meters",
  output: [
    { key: "id", type: "number", label: "Meter ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "unit", type: "string", label: "Unit" },
    { key: "measurementType", type: "string", label: "Measurement type" },
  ],
  sample: { id: 31, name: "Hours run", unit: "h", measurementType: "HOURS" },
});
