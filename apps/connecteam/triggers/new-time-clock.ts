import { snapshotTrigger } from "../lib/triggers.ts";
import timeClockList from "../actions/time-clock-list.ts";

/**
 * Bounded collection (brief 9.1 c): `GET /time-clock/v1/time-clocks` answers the account's whole time clocks in one
 * unpaginated response (https://developer.connecteam.com/openapi/connecteam-api-documentation.json
 * , verified 2026-11-10); the kit refuses more than 5000 rows.
 */
export default snapshotTrigger({
  key: "new-time-clock",
  title: "New Time Clock",
  description: "The run gets each time clock newly created in the Connecteam account.",
  output: [
    { key: "id", type: "number", label: "Time clock ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "isArchived", type: "boolean", label: "Archived" },
  ],
  sample: { id: 301, name: "Warehouse clock", isArchived: false },
  fetchRows: async (_params, ctx) => {
    const out = await timeClockList.execute({}, ctx) as { timeClocks?: unknown[] };
    return out.timeClocks ?? [];
  },
  idOf: (row) => (row as { id?: unknown }).id,
});
