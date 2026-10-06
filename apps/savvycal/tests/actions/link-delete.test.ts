import { assertEquals } from "@std/assert";
import linkDelete from "../../actions/link-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("link-delete: DELETE /v1/links/{id} returns the deleted link", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "link_1" } }]);
  const out = await linkDelete.execute({ linkId: "link_1" }, ctx) as { id: string };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(pathOf(calls[0].url), "/v1/links/link_1");
  assertEquals(out.id, "link_1");
});
