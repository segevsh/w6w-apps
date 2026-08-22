import type { ActionDefinition } from "@w6w/types";
import { compact, DeelClient, json } from "../lib/client.ts";

/**
 * `POST /time_offs` — verified against Deel's own OpenAPI document
 * (`hris-endpoints.json`, `create-time-off-request`), whose `data` object
 * requires **`start_date`, `end_date` and `recipient_profile_id`**.
 *
 * `use_deel_approval_flow` is the field worth knowing: with it, the request
 * enters Deel's own approval chain; without it, the request is created in
 * whatever `status` you set. A workflow that has already collected an approval
 * elsewhere wants the latter.
 */
const action: ActionDefinition = {
  key: "time-off-create",
  type: "perform",
  resource: "timeOff",
  title: "Request time off",
  description: "Create a time-off request for a worker.",
  // Two calls create two requests.
  idempotent: false,
  params: [
    {
      key: "recipientProfileId",
      label: "Recipient Profile ID",
      type: "string",
      required: true,
      default: "",
      hint: "The HRIS profile the time off is for.",
    },
    { key: "startDate", label: "Start Date", type: "date", required: true, default: "" },
    { key: "endDate", label: "End Date", type: "date", required: true, default: "" },
    {
      key: "timeOffTypeId",
      label: "Time Off Type ID",
      type: "string",
      default: "",
      hint: "From the time-off types lookup.",
    },
    { key: "policyId", label: "Policy ID", type: "string", default: "" },
    { key: "reason", label: "Reason", type: "string", default: "" },
    { key: "description", label: "Description", type: "text", default: "" },
    {
      key: "isPaid",
      label: "Paid",
      type: "boolean",
      default: null,
    },
    {
      key: "useDeelApprovalFlow",
      label: "Use Deel's Approval Flow",
      type: "boolean",
      default: null,
      hint: "On: the request goes through Deel's approvers. Off: it is created as-is.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { value: "PENDING", label: "Pending" },
        { value: "APPROVED", label: "Approved" },
      ],
      hint: "Only meaningful when Deel's approval flow is off.",
    },
    {
      key: "dates",
      label: "Dates",
      type: "json",
      default: "",
      hint: "Optional per-day detail for partial days.",
    },
  ],
  output: [{ key: "time_offs", type: "array", label: "Created requests" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const recipient = String(p.recipientProfileId ?? "").trim();
    const startDate = String(p.startDate ?? "").trim();
    const endDate = String(p.endDate ?? "").trim();
    if (!recipient) throw new Error("`recipientProfileId` is required");
    if (!startDate) throw new Error("`startDate` is required");
    if (!endDate) throw new Error("`endDate` is required");

    const data = compact({
      recipient_profile_id: recipient,
      start_date: startDate,
      end_date: endDate,
      time_off_type_id: p.timeOffTypeId,
      policy_id: p.policyId,
      reason: p.reason,
      description: p.description,
      is_paid: typeof p.isPaid === "boolean" ? p.isPaid : undefined,
      use_deel_approval_flow: typeof p.useDeelApprovalFlow === "boolean"
        ? p.useDeelApprovalFlow
        : undefined,
      status: p.status,
      dates: json(p.dates, "dates"),
    });

    ctx.log("info", "creating Deel time-off request", { recipient, startDate, endDate });

    return await new DeelClient(ctx).request("/time_offs", { method: "POST", body: { data } });
  },
};

export default action;
