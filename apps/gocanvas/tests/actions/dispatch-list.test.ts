import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/dispatch-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("dispatch-list: GET /api/v3/dispatches with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }] }]);
  const out = await action.execute(
    { "formId": 346103, "status": "assigned", "scheduledStartDate": "2024-01-30" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/dispatches");
  assertEquals(queryOf(calls[0].url), {
    "form_id": "346103",
    "status": "assigned",
    "scheduled_start_date": "2024-01-30",
  });
  assertEquals(calls[0].body, null);
  assertEquals((out as { items: unknown }).items, [{ "id": 1 }]);

  await assertRejects(
    async () => await action.execute({ status: "assigned" }, mockCtx().ctx),
    Error,
    "at least one of",
  );
});
