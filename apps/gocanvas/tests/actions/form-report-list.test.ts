import { assertEquals } from "@std/assert";
import action from "../../actions/form-report-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-report-list: GET /api/v3/forms/346127/reports with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 7346 }] }]);
  const out = await action.execute({ "formId": 346127 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/forms/346127/reports");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals((out as { items: unknown }).items, [{ "id": 7346 }]);
});
