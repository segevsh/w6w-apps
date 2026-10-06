import { assertEquals } from "@std/assert";
import linkDuplicate from "../../actions/link-duplicate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("link-duplicate: POST /v1/links/{id}/duplicate", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "link_copy" } }]);
  const out = await linkDuplicate.execute({ linkId: "link_1" }, ctx) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/links/link_1/duplicate");
  assertEquals(out.id, "link_copy");
});
