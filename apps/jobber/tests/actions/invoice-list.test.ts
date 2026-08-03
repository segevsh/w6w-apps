import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-list.ts";

Deno.test("invoice-list: past_due is a Jobber-computed status, offered as a filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { invoices: { nodes: [] } } } }]);
  await action.execute({ status: "past_due" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.filter, { status: "past_due" });
});

Deno.test("invoice-list: both date windows map to their own filter keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { invoices: { nodes: [] } } } }]);
  await action.execute({
    dueBefore: "2026-09-01T00:00:00Z",
    issuedAfter: "2026-01-01T00:00:00Z",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.filter, {
    dueDate: { before: "2026-09-01T00:00:00Z" },
    issuedDate: { after: "2026-01-01T00:00:00Z" },
  });
});
