import {
  COMPANY_PARAM,
  dayCount,
  isoDay,
  LOOKBACK_PARAM,
  snapshotTrigger,
  uuidOf,
} from "../lib/triggers.ts";
import contractorPaymentList from "../actions/contractor-payment-list.ts";

export default snapshotTrigger({
  key: "new-contractor-payment",
  title: "New Contractor Payment",
  description: "The run gets each contractor payment that appears in the watched date window.",
  action: contractorPaymentList,
  params: [COMPANY_PARAM, LOOKBACK_PARAM(30)],
  input: (p) => ({
    companyId: p.companyId,
    startDate: isoDay(-dayCount(p.lookbackDays, 30)),
    endDate: isoDay(0),
  }),
  items: (result) =>
    (((result as { contractor_payments?: unknown[] })?.contractor_payments) ?? []).flatMap((
      group,
    ) =>
      ((group as { contractor_uuid?: unknown; payments?: unknown[] }).payments ?? []).map((
        pay,
      ) => ({
        contractor_uuid: (group as { contractor_uuid?: unknown }).contractor_uuid,
        ...(pay as object),
      }))
    ),
  idOf: uuidOf,
  updated: false,
  output: [
    { key: "uuid", type: "string", label: "Payment UUID" },
    { key: "contractor_uuid", type: "string", label: "Contractor" },
    { key: "date", type: "string", label: "Payment date" },
    { key: "status", type: "string", label: "Status" },
    { key: "wage_total", type: "string", label: "Total" },
  ],
  sample: {
    uuid: "payment-1",
    contractor_uuid: "contractor-1",
    date: "2026-11-05",
    status: "Funded",
    wage_total: "500.00",
  },
});
