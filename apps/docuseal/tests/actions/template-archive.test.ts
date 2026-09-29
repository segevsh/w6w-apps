import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-archive.ts";

Deno.test("template-archive: DELETEs the template by id", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: 1, archived_at: "2026-09-29T00:00:00Z" },
  }]);
  const out = await action.execute!({ id: 1 }, ctx);
  assertEquals(calls[0].url, "https://api.docuseal.com/templates/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { id: 1, archived_at: "2026-09-29T00:00:00Z" });
  assertEquals(action.idempotent, true);
});
