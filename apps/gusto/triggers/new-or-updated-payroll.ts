import {
  asArray,
  COMPANY_PARAM,
  dayCount,
  isoDay,
  LOOKBACK_PARAM,
  snapshotTrigger,
} from "../lib/triggers.ts";
import payrollList from "../actions/payroll-list.ts";

export default snapshotTrigger({
  key: "new-or-updated-payroll",
  title: "New or Updated Payroll",
  description:
    "The run gets each payroll in the watched pay-period window that is new or changed, such as a draft being processed.",
  action: payrollList,
  params: [COMPANY_PARAM, LOOKBACK_PARAM(180)],
  input: (p) => ({
    companyId: p.companyId,
    startDate: isoDay(-dayCount(p.lookbackDays, 180)),
    endDate: isoDay(60),
    processingStatuses: "processed,unprocessed",
    returnAll: true,
  }),
  items: asArray,
  idOf: (item) =>
    String(
      (item as { payroll_uuid?: unknown; uuid?: unknown }).payroll_uuid ??
        (item as { uuid?: unknown }).uuid ?? "",
    ),
  updated: true,
  output: [
    { key: "payroll_uuid", type: "string", label: "Payroll UUID" },
    { key: "check_date", type: "string", label: "Check date" },
    { key: "processed", type: "boolean", label: "Processed" },
    { key: "payroll_deadline", type: "string", label: "Deadline" },
    { key: "pay_period", type: "object", label: "Pay period" },
  ],
  sample: {
    payroll_uuid: "payroll-1",
    check_date: "2026-11-15",
    processed: false,
    payroll_deadline: "2026-11-12T19:00:00Z",
    pay_period: { start_date: "2026-11-01", end_date: "2026-11-15" },
  },
});
