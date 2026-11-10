import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/voucher-list.ts";

export default pollFromListAction({
  key: "new-or-updated-voucher",
  title: "New or Updated Voucher",
  description:
    "The run gets each voucher that is new or has been edited since the last check, polled from the existing `voucher-list` action sorted by `updatedDate` descending (`sort=updatedDate,DESC`).",
  action,
  input: () => ({
    voucherType: "any",
    voucherStatus: "any",
    sort: "updatedDate,DESC",
    page: 0,
    size: 100,
  }),
  items: (result) => (result as { content?: unknown[] }).content ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id}:${(item as { updatedDate?: unknown }).updatedDate}`,
  output: [
    { key: "id", type: "string", label: "Voucher ID" },
    { key: "voucherType", type: "string", label: "Voucher type" },
    { key: "voucherNumber", type: "string", label: "Voucher number" },
    { key: "createdDate", type: "string", label: "Created date" },
    { key: "updatedDate", type: "string", label: "Updated date" },
  ],
  sample: {
    id: "e9066f04-8cc7-4616-93f8-ac9ecc8479c8",
    voucherType: "invoice",
    voucherNumber: "RE0001",
    createdDate: "2026-11-09T10:00:00.000+01:00",
    updatedDate: "2026-11-09T11:00:00.000+01:00",
  },
  maxPages: 1,
});
