import { assertEquals } from "@std/assert";
import action from "../../actions/site-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("site-update: PATCH /api/v3/sites/14 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 14 } }]);
  const out = await action.execute({ "siteId": 14, "city": "Boca Raton" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v3/sites/14");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), { "city": "Boca Raton" });
  assertEquals(out, { "id": 14 });
});
