import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import action from "../../actions/report-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("report-get: calls GET /v3/reports/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", name: "Spring" } }]);
  const out = await action.execute({ reportId: "r1" }, ctx) as { item: { name: string } };
  assertEquals(pathOf(calls[0].url), "/v3/reports/r1");
  assertEquals(out.item.name, "Spring");
});

Deno.test("report-get: surfaces the split-test 403", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { code: 403, message: "call parent 77 instead" } },
  }]);
  const err = await assertRejects(async () => await action.execute({ reportId: "r1" }, ctx));
  assertMatch((err as Error).message, /CleverReach 403: call parent 77 instead/);
});
