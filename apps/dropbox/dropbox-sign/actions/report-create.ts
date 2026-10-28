import type { ActionDefinition } from "@w6w/types";
import { csv, DropboxSignClient } from "../lib/client.ts";

/**
 * `POST /report/create` — verified against the official OpenAPI document
 * (`reportCreate`; required `start_date`, `end_date`, `report_type`).
 *
 * **This does not return a report.** It queues one, and Dropbox Sign *emails*
 * the result to the account. A workflow that expects rows back gets a success
 * message instead — which is why the output says so rather than pretending
 * there is data to read.
 *
 * The dates are `MM/DD/YYYY`, not ISO. That is unusual enough to check locally:
 * an ISO date reaches the API as a plausible-looking string and comes back as a
 * validation error at best, or a report for the wrong window at worst.
 */
const DATE = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;

const action: ActionDefinition = {
  key: "report-create",
  type: "perform",
  resource: "report",
  title: "Request a report",
  description: "Queue a usage report. Dropbox Sign emails it to the account — nothing is returned.",
  idempotent: false,
  params: [
    {
      key: "startDate",
      label: "Start Date",
      type: "string",
      required: true,
      default: "",
      placeholder: "01/31/2026",
      hint: "MM/DD/YYYY — not ISO. Inclusive.",
    },
    {
      key: "endDate",
      label: "End Date",
      type: "string",
      required: true,
      default: "",
      placeholder: "02/28/2026",
      hint: "MM/DD/YYYY — not ISO. Inclusive.",
    },
    {
      key: "reportType",
      label: "Report Types",
      type: "multiselect",
      required: true,
      default: ["document_status"],
      options: [
        { value: "document_status", label: "Document status" },
        { value: "user_activity", label: "User activity" },
        { value: "sms_activity", label: "SMS activity" },
        { value: "fax_usage", label: "Fax usage" },
      ],
      hint: "At most two per request.",
    },
  ],
  output: [
    { key: "success", type: "string", label: "Confirmation — the report arrives by email" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const start = String(p.startDate ?? "").trim();
    const end = String(p.endDate ?? "").trim();
    for (const [label, value] of [["startDate", start], ["endDate", end]] as const) {
      if (!value) throw new Error(`\`${label}\` is required`);
      if (!DATE.test(value)) {
        throw new Error(`\`${label}\` must be MM/DD/YYYY — Dropbox Sign does not take ISO dates`);
      }
    }
    const types = csv(p.reportType);
    if (!types) throw new Error("`reportType` is required");
    if (types.length > 2) throw new Error("`reportType` takes at most two types");

    ctx.log("info", "requesting a Dropbox Sign report", { types });

    return await new DropboxSignClient(ctx).request("/report/create", {
      method: "POST",
      body: { start_date: start, end_date: end, report_type: types },
    });
  },
};

export default action;
