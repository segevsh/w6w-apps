import type { ActionDefinition } from "@w6w/types";
import { BambooClient } from "../lib/client.ts";

interface Input {
  start: string;
  end: string;
  id?: string;
  action?: string;
  employeeId?: string;
  type?: string;
  status?: string;
  excludeNote?: boolean;
}

/**
 * `GET /api/v1/time_off/requests` — time off requests in a date window.
 *
 * `start` and `end` are both REQUIRED — this is the only list endpoint in the
 * app with a mandatory window, and the reason is that the filter is an OVERLAP
 * test rather than a containment one. The docs spell out each side separately:
 *
 *   > `start` — "Returns any request whose **end** date falls on or after this
 *   >   date — i.e., requests that are still active at the start of your window."
 *   > `end`   — "Returns any request whose **start** date falls on or before this
 *   >   date — i.e., requests that have begun by the end of your window."
 *
 * Read together: pass your range and you get every request overlapping it,
 * including ones that started before it or end after it. That is usually what
 * people want and rarely what they expect, so the hints say it.
 *
 * `action` defaults to `view`, and the three values answer different questions —
 * `view` (requests I can see), `approve` (requests awaiting my decision), and
 * `myRequests` (my own). `approve` is the one that makes an approval workflow
 * possible, so it is offered as a closed `select` rather than free text.
 */
const listTimeOffRequests: ActionDefinition<Input> = {
  key: "list-time-off-requests",
  type: "search",
  resource: "time-off-request",
  title: "List Time Off Requests",
  description:
    "List time off requests overlapping a date window, optionally narrowed to one employee, " +
    "type or status. Use Action = approve to find requests awaiting the key holder's decision.",
  params: [
    {
      key: "start",
      label: "Window start",
      type: "date",
      required: true,
      hint:
        "YYYY-MM-DD. Matches any request still ACTIVE on this date — i.e. whose end date is on " +
        "or after it — so requests that began earlier are included.",
    },
    {
      key: "end",
      label: "Window end",
      type: "date",
      required: true,
      hint:
        "YYYY-MM-DD. Matches any request that has BEGUN by this date — i.e. whose start date is " +
        "on or before it — so requests running past it are included.",
    },
    {
      key: "action",
      label: "Perspective",
      type: "select",
      default: "view",
      options: [
        { value: "view", label: "Requests the key holder can view" },
        { value: "approve", label: "Requests awaiting the key holder's approval" },
        { value: "myRequests", label: "The key holder's own requests" },
      ],
      hint: "Defaults to `view`.",
    },
    {
      key: "employeeId",
      label: "Employee ID",
      type: "string",
      hint: "Limit to one internal employee ID.",
    },
    {
      key: "id",
      label: "Request ID",
      type: "string",
      hint: "Limit the response to one particular request ID.",
    },
    {
      key: "type",
      label: "Time off type IDs",
      type: "string",
      hint:
        "Comma-separated time off type IDs. Discover them with the List Time Off Types action. " +
        "Omit for all types.",
    },
    {
      key: "status",
      label: "Statuses",
      type: "string",
      placeholder: "approved,requested",
      hint:
        "Comma-separated statuses. Accepted: `approved`, `denied`, `superceded`, `requested`, " +
        "`canceled`. Omit for all.",
    },
    {
      key: "excludeNote",
      label: "Exclude notes",
      type: "boolean",
      hint: "Omit the `notes` object from each request in the response.",
    },
  ],
  output: [{ key: "requests", type: "array", label: "Time off requests" }],

  execute(input, ctx) {
    return new BambooClient(ctx).request("/time_off/requests", {
      query: {
        start: input.start,
        end: input.end,
        id: input.id,
        action: input.action,
        employeeId: input.employeeId,
        type: input.type,
        status: input.status,
        // Documented as "when set to any truthy value" — send the flag only when
        // asked, rather than a literal `false` that would also read as truthy.
        excludeNote: input.excludeNote ? "1" : undefined,
      },
    });
  },
};

export default listTimeOffRequests;
