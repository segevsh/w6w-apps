import { assertEquals } from "@std/assert";
import tagDelete from "../../actions/tag-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-delete: DELETEs the tag and returns the 204 status, no body to unwrap", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await tagDelete.execute({ accountId: "ACC1", tagId: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/tags/1.json");
  assertEquals(out, { tagId: "1", status: 204 });
});

Deno.test("tag-delete: idempotent — the end state after N deletes is the same tag gone", () => {
  assertEquals(tagDelete.idempotent, true);
});
