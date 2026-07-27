import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deal-create.ts";

Deno.test("deal-create: POSTs /deals with mapped snake_case body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 1 } } }]);
  await action.execute!(
    { title: "Big deal", value: 500, currency: "USD", personId: 9, stageId: 3 },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v1/deals");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.title, "Big deal");
  assertEquals(body.value, 500);
  assertEquals(body.currency, "USD");
  assertEquals(body.person_id, 9);
  assertEquals(body.stage_id, 3);
});

Deno.test("deal-create: omits unset optional fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 1 } } }]);
  await action.execute!({ title: "Minimal" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { title: "Minimal" });
});
