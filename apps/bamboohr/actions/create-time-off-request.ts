import type { ActionDefinition } from "@w6w/types";
import { BambooClient, compact } from "../lib/client.ts";

interface Input {
  employeeId: string;
  status: string;
  start: string;
  end: string;
  timeOffTypeId: string;
  amount?: number;
  previousRequest?: string;
  notes?: unknown;
  dates?: unknown;
}

/**
 * `PUT /api/v1/employees/{employeeId}/time_off/request` — create a time off request.
 *
 * Note the method (**PUT**, on a path under the employee) and the required set,
 * which the schema states as `["status", "start", "end", "timeOffTypeId"]`.
 * `status` being required on a CREATE is unusual and consequential — see below.
 *
 * ## `status` is a permission gate, not a preference
 *
 * "Submitting `approved` or `denied` is only honored when the caller is an
 * owner/admin or has view/edit access to the time off type field for the target
 * employee; **other callers receive 403**. When honored, these statuses record
 * the request directly and suppress approval notifications."
 *
 * So `requested` is the safe default and the only value that works for every
 * key; the two privileged values bypass the approval workflow entirely and
 * silence its notifications. The param hint says all of this because a 403 here
 * looks like a broken credential rather than an over-ambitious status.
 *
 * ## `previousRequest` is destructive
 *
 * The docs do not hedge: "Supplying a `previousRequest` ID performs a
 * **destructive supersede**: the prior request's status is set to `superceded`,
 * all approvals on its workflow are removed and the workflow is marked deleted,
 * and any home-page notifications tied to that workflow are deleted."
 * That is not a link — it is a deletion. The hint says so.
 *
 * ## `amount` vs `dates`
 *
 * They are not additive: "`amount` — Total hours or days requested. **Ignored
 * when `dates` array is provided** (sum of daily amounts is used instead)."
 * Setting both is not an error, it just silently discards `amount`.
 *
 * `idempotent: false` — there is no idempotency key and no natural dedupe, so a
 * retry books a second block of leave.
 */
const createTimeOffRequest: ActionDefinition<Input> = {
  key: "create-time-off-request",
  type: "perform",
  resource: "time-off-request",
  title: "Create Time Off Request",
  description:
    "Create a time off request for an employee. Submit as `requested` to enter the normal " +
    "approval workflow, or as `approved`/`denied` to record it directly if the key has the " +
    "permission for that.",
  idempotent: false,
  params: [
    {
      key: "employeeId",
      label: "Employee ID",
      type: "string",
      required: true,
      hint: "The INTERNAL employee ID the request is for.",
    },
    {
      key: "timeOffTypeId",
      label: "Time off type ID",
      type: "string",
      required: true,
      hint: "Discover the IDs with the List Time Off Types action.",
    },
    {
      key: "start",
      label: "Start date",
      type: "date",
      required: true,
      hint: "YYYY-MM-DD.",
    },
    {
      key: "end",
      label: "End date",
      type: "date",
      required: true,
      hint: "YYYY-MM-DD. Must be on or after the start date.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      default: "requested",
      options: [
        { value: "requested", label: "Requested — enters the approval workflow" },
        { value: "approved", label: "Approved — records directly (needs permission)" },
        { value: "denied", label: "Denied — records directly (needs permission)" },
        { value: "declined", label: "Declined — synonym for denied" },
      ],
      hint:
        "`requested` is the only value every key can use. `approved`/`denied` require the key to " +
        "be an owner/admin or to have view/edit access to the time off type for that employee — " +
        "otherwise BambooHR returns 403. They also record the request directly and SUPPRESS " +
        "approval notifications.",
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      hint:
        "Total hours or days requested. IGNORED when Dates is supplied — the sum of the daily " +
        "amounts is used instead.",
    },
    {
      key: "dates",
      label: "Dates",
      type: "json",
      hint: 'Optional per-day breakdown, e.g. `[{"ymd": "2026-09-01", "amount": 8}]`. Overrides ' +
        "Amount.",
    },
    {
      key: "notes",
      label: "Notes",
      type: "json",
      hint: 'Optional notes from the employee or manager, e.g. `[{"from": "employee", ' +
        '"note": "Family trip"}]`.',
    },
    {
      key: "previousRequest",
      label: "Supersede request ID",
      type: "string",
      hint:
        "DESTRUCTIVE. Supplying a previous request ID sets that request to `superceded`, REMOVES " +
        "all approvals on its workflow, marks the workflow deleted and deletes its home-page " +
        "notifications. Leave empty unless you intend exactly that.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (201 on success)" }],

  async execute(input, ctx) {
    const body = compact({
      status: input.status,
      start: input.start,
      end: input.end,
      timeOffTypeId: input.timeOffTypeId,
      amount: input.amount,
      previousRequest: input.previousRequest,
      notes: input.notes,
      dates: input.dates,
    });

    await new BambooClient(ctx).request(
      `/employees/${encodeURIComponent(input.employeeId)}/time_off/request`,
      { method: "PUT", body },
    );
    return { status: 201 };
  },
};

export default createTimeOffRequest;
