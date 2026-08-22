import type { ActionDefinition } from "@w6w/types";
import { companyIdFrom, GustoClient } from "../lib/client.ts";
import { COMPANY_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/companies/{company_id}/time_off_requests` — who is off, and whether
 * it was approved.
 *
 * `status` is the field that matters and the one most easily skipped: a
 * *pending* request is somebody's plan, not a fact. A calendar or capacity
 * workflow that treats pending and approved alike will book cover for time off
 * that never happens, and an approvals workflow wants exactly the pending ones.
 *
 * `request_type` separates vacation from sick leave, which many policies count
 * against different balances.
 */
const action: ActionDefinition = {
  key: "time-off-request-list",
  type: "read",
  resource: "timeoff",
  title: "List time off requests",
  description:
    "Time off requests with their approval status — pending is a plan, approved is a fact, and " +
    "treating them alike books cover for leave nobody takes.",
  params: [
    COMPANY_PARAM,
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any" },
        { value: "pending", label: "Pending — awaiting approval" },
        { value: "approved", label: "Approved" },
        { value: "denied", label: "Denied" },
      ],
    },
    {
      key: "requestType",
      label: "Type",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any" },
        { value: "vacation", label: "Vacation" },
        { value: "sick", label: "Sick" },
      ],
    },
    { key: "startDate", label: "Starting On Or After", type: "date", default: "" },
    { key: "endDate", label: "Ending On Or Before", type: "date", default: "" },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "uuid", type: "string", label: "Request UUID" },
    { key: "status", type: "string", label: "Status" },
    { key: "employee_uuid", type: "string", label: "Employee" },
    { key: "request_type", type: "string", label: "Type" },
    { key: "days", type: "object", label: "Days and hours" },
    { key: "creator_uuid", type: "string", label: "Created by" },
    { key: "approver_uuid", type: "string", label: "Approved by" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = companyIdFrom(ctx, p.companyId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    return await new GustoClient(ctx).requestAll(
      `/v1/companies/${encodeURIComponent(companyId)}/time_off_requests`,
      {
        query: {
          status: String(p.status ?? "") || undefined,
          request_type: String(p.requestType ?? "") || undefined,
          start_date: String(p.startDate ?? "") || undefined,
          end_date: String(p.endDate ?? "") || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
