import { assertEquals } from "@std/assert";
import action from "../../actions/voucher-list.ts";
import { mockCtx, PAGE, pathOf, queryOf } from "../_helpers.ts";

Deno.test("voucher-list: GET /v1/voucherlist with every filter named as documented", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await action.execute({
    voucherType: "invoice,creditnote",
    voucherStatus: "open,overdue",
    archived: "false",
    contactId: "c1",
    voucherNumber: "RE1012",
    voucherDateFrom: "2026-01-01",
    voucherDateTo: "2026-01-31",
    createdDateFrom: "2026-01-01",
    createdDateTo: "2026-01-31",
    updatedDateFrom: "2026-01-02",
    updatedDateTo: "2026-01-30",
    sort: "voucherDate,DESC",
    page: 0,
    size: 250,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/voucherlist");
  assertEquals(queryOf(calls[0].url), {
    voucherType: "invoice,creditnote",
    voucherStatus: "open,overdue",
    archived: "false",
    contactId: "c1",
    voucherNumber: "RE1012",
    voucherDateFrom: "2026-01-01",
    voucherDateTo: "2026-01-31",
    createdDateFrom: "2026-01-01",
    createdDateTo: "2026-01-31",
    updatedDateFrom: "2026-01-02",
    updatedDateTo: "2026-01-30",
    sort: "voucherDate,DESC",
    page: "0",
    size: "250",
  });
});

Deno.test("voucher-list: declares the two mandatory filters as required, defaulting to any", () => {
  for (const key of ["voucherType", "voucherStatus"]) {
    const p = action.params!.find((p) => p.key === key)!;
    assertEquals(p.required, true);
    assertEquals(p.default, "any");
  }
});
