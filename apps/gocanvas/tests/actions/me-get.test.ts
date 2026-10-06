import { assertEquals } from "@std/assert";
import action from "../../actions/me-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("me-get: GET /api/v3/me with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": 7, "login": "a@b.co", "company_name": "Acme" },
  }]);
  const out = await action.execute({} as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/me");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 7, "login": "a@b.co", "company_name": "Acme" });
});
