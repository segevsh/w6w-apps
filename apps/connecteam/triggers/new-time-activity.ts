import { clock, sinceTrigger } from "../lib/since.ts";
import timeActivityList from "../actions/time-activity-list.ts";

interface Params {
  timeClockId?: number | string;
}

interface Point {
  timestamp?: number;
}

interface Activity {
  id?: string;
  start?: Point;
  end?: Point | null;
  createdAt?: number | null;
  modifiedAt?: number | null;
  [key: string]: unknown;
}

interface ByUser {
  userId?: number;
  shifts?: Activity[];
  manualBreaks?: Activity[];
  timeOffs?: Activity[] | null;
}

/** One activity with the user and kind it was grouped under. */
export interface TimeActivity extends Activity {
  userId?: number;
  type: "shift" | "manual_break" | "time_off";
}

/** Backdated entries are found this many days before the window; older ones are not seen. */
const BACKDATE_DAYS = 2;

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** `createdAt` is an integer Unix time; read it as seconds (milliseconds if it is that large). */
const toMs = (n: number) => (n > 1e11 ? n : n * 1000);

/**
 * Since-filter (brief 9.1 b): `GET /time-clock/v1/time-clocks/{timeClockId}/time-activities`
 * answers shifts, manual breaks and time-off entries grouped by user, for the mandatory
 * `startDate`/`endDate` window (ISO `YYYY-MM-DD`) in ONE response with no pager; each carries `id`,
 * `createdAt` and `modifiedAt` (https://developer.connecteam.com/openapi/connecteam-api-documentation.json
 * , verified 2026-11-10). The window runs from `BACKDATE_DAYS` days before the look-back to
 * tomorrow, so an entry recorded after the fact for a day shortly before is still found; an entry
 * backdated further is not. An entry with no `createdAt` falls back to its start time, so it can
 * never pass for new unless it started after the trigger was enabled. Safeguards 9.8 and 9.9 live
 * in `lib/since.ts`.
 */
export default sinceTrigger<TimeActivity, Params>({
  key: "new-time-activity",
  title: "New Time Activity",
  description:
    "The run gets each new shift, manual break or time-off entry recorded on one Connecteam time clock.",
  params: [{
    key: "timeClockId",
    label: "Time Clock",
    type: "number",
    required: true,
    hint: "The time clock to watch, e.g. from a time-clock-list result.",
  }],
  async fetchWindow(sinceMs, ctx, params) {
    const timeClockId = Number(params.timeClockId);
    if (!Number.isInteger(timeClockId) || timeClockId < 1) {
      throw new Error("Set Time Clock to the time clock to watch.");
    }
    const out = await timeActivityList.execute({
      timeClockId,
      startDate: day(sinceMs - BACKDATE_DAYS * 86_400_000),
      endDate: day(clock.now() + 86_400_000),
    }, ctx) as { timeActivitiesByUsers?: ByUser[] };
    const rows: TimeActivity[] = [];
    for (const user of out.timeActivitiesByUsers ?? []) {
      for (
        const [type, list] of [
          ["shift", user.shifts],
          ["manual_break", user.manualBreaks],
          ["time_off", user.timeOffs],
        ] as const
      ) {
        for (const activity of list ?? []) rows.push({ ...activity, userId: user.userId, type });
      }
    }
    return rows;
  },
  idOf: (a) => `${a.type}:${a.id}`,
  timeOf: (a) => {
    const at = typeof a.createdAt === "number" ? a.createdAt : a.start?.timestamp;
    return typeof at === "number" ? toMs(at) : undefined;
  },
  output: [
    { key: "id", type: "string", label: "Activity ID" },
    { key: "type", type: "string", label: "Type (shift, manual_break or time_off)" },
    { key: "userId", type: "number", label: "User ID" },
    { key: "start", type: "object", label: "Start (timestamp, timezone)" },
    { key: "end", type: "object", label: "End (timestamp, timezone)" },
    { key: "createdAt", type: "number", label: "Created (Unix)" },
    { key: "modifiedAt", type: "number", label: "Modified (Unix)" },
  ],
  sample: {
    id: "act_7c1",
    type: "shift",
    userId: 9001,
    start: { timestamp: 1762683600, timezone: "America/New_York" },
    end: { timestamp: 1762712400, timezone: "America/New_York" },
    createdAt: 1762712500,
    modifiedAt: 1762712500,
  },
});
