import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-objects.ts";

Deno.test("list-objects: GETs /v2/list-objects and returns the response verbatim", async () => {
  const body = { status: "success", objects: [{ transaction_ref: "t1" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/list-objects");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

Deno.test("list-objects: forwards templateId, transactionType, limit, and offset", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", objects: [] } }]);
  await action.execute!(
    { templateId: "tpl-1", transactionType: "PDF", limit: 5, offset: 10 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("template_id"), "tpl-1");
  assertEquals(url.searchParams.get("transaction_type"), "PDF");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.get("offset"), "10");
});
