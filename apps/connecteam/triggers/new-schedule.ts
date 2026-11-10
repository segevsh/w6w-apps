import { snapshotTrigger } from "../lib/triggers.ts";
import schedulerList from "../actions/scheduler-list.ts";

/**
 * Bounded collection (brief 9.1 c): `GET /scheduler/v1/schedulers` answers the account's whole schedules in one
 * unpaginated response (https://developer.connecteam.com/openapi/connecteam-api-documentation.json
 * , verified 2026-11-10); the kit refuses more than 5000 rows.
 */
export default snapshotTrigger({
  key: "new-schedule",
  title: "New Schedule",
  description: "The run gets each schedule newly created in the Connecteam account.",
  output: [
    { key: "schedulerId", type: "number", label: "Schedule ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "isArchived", type: "boolean", label: "Archived" },
    { key: "timezone", type: "string", label: "Timezone" },
  ],
  sample: {
    schedulerId: 101,
    name: "Front of house",
    isArchived: false,
    timezone: "America/New_York",
  },
  fetchRows: async (_params, ctx) => {
    const out = await schedulerList.execute({}, ctx) as { schedulers?: unknown[] };
    return out.schedulers ?? [];
  },
  idOf: (row) => (row as { schedulerId?: unknown }).schedulerId,
});
