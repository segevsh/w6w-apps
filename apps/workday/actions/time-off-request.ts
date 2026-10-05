import type { ActionDefinition } from "@w6w/types";
import { dateOnly, idValue, pathId, WorkdayClient } from "../lib/client.ts";
import { idParam, WORKER_ID_HINT } from "../lib/actions.ts";

/** Workday's reference ID for the business-process action "Submitted". */
const SUBMITTED = "d9e4223e446c11de98360015c5e6daf6";

interface DayInput {
  date?: unknown;
  dailyQuantity?: unknown;
  timeOffType?: unknown;
  position?: unknown;
  comment?: unknown;
  reason?: unknown;
  start?: unknown;
  end?: unknown;
}

const action: ActionDefinition = {
  key: "time-off-request",
  type: "perform",
  idempotent: false,
  resource: "time-off",
  title: "Request time off",
  description:
    "Create a time off request for a worker and start the Request Time Off business process. Workday's flow is " +
    "three calls: list the eligible absence types, validate the dates, then this. By default the event is " +
    "submitted; turn `submit` off to leave it in the initiator's inbox. Not idempotent — a retry creates a " +
    "second request. Absence Management v5 `POST /workers/{ID}/requestTimeOff`.",
  params: [
    idParam("workerId", "Worker ID", WORKER_ID_HINT),
    {
      key: "days",
      label: "Days",
      type: "json",
      required: true,
      hint: "Array of day entries, one per requested day: " +
        '[{ "date": "2026-11-02", "dailyQuantity": 1, "timeOffType": "<id from eligible types>", ' +
        '"comment": "optional", "reason": "<optional reason id>", "position": "<optional position id>" }]. ' +
        "`start`/`end` (time of day) are accepted for hourly time off.",
    },
    {
      key: "submit",
      label: "Submit the request",
      type: "boolean",
      default: true,
      hint:
        "Sends `businessProcessParameters.action` = Submitted. Off leaves the event unsubmitted.",
    },
    {
      key: "acceptWarnings",
      label: "Accept warnings",
      type: "boolean",
      hint:
        "Sends `wd-warning-action: updateonwarning` so a request that only trips warnings is persisted.",
    },
  ],
  output: [
    { key: "record", type: "object", label: "The time off request event as Workday returns it" },
  ],

  async execute(input, ctx) {
    const i = input as Record<string, unknown>;
    const workerId = pathId(i.workerId, "workerId");
    const days = buildDays(i.days);
    const body: Record<string, unknown> = { days };
    if (i.submit !== false) body.businessProcessParameters = { action: { id: SUBMITTED } };
    const headers: Record<string, string> = {};
    if (i.acceptWarnings === true) headers["wd-warning-action"] = "updateonwarning";

    const record = await new WorkdayClient(ctx).request(
      "absenceManagement",
      `/workers/${workerId}/requestTimeOff`,
      { method: "POST", body, headers },
    );
    return { record };
  },
};

function buildDays(value: unknown): unknown[] {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error("`days` is not valid JSON");
    }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("`days` must be a non-empty JSON array of day entries");
  }
  return parsed.map((raw, n) => {
    const d = raw as DayInput;
    if (!d || typeof d !== "object") throw new Error(`\`days[${n}]\` must be an object`);
    const date = dateOnly(d.date, `days[${n}].date`);
    if (!date) throw new Error(`\`days[${n}].date\` is required (yyyy-mm-dd)`);
    const qty = Number(d.dailyQuantity);
    if (d.dailyQuantity === undefined || !Number.isFinite(qty) || qty <= 0) {
      throw new Error(`\`days[${n}].dailyQuantity\` must be a positive number`);
    }
    if (!d.timeOffType) throw new Error(`\`days[${n}].timeOffType\` is required`);
    const day: Record<string, unknown> = {
      date,
      dailyQuantity: qty,
      timeOffType: { id: idValue(d.timeOffType, `days[${n}].timeOffType`) },
    };
    if (d.position) day.position = { id: idValue(d.position, `days[${n}].position`) };
    if (d.reason) day.reason = { id: idValue(d.reason, `days[${n}].reason`) };
    if (d.comment) day.comment = String(d.comment);
    if (d.start) day.start = String(d.start);
    if (d.end) day.end = String(d.end);
    return day;
  });
}

export default action;
