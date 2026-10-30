import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import showcaseDelete from "../../actions/showcase-delete.ts";
import { mockCtx, url } from "../_helpers.ts";

test("showcase-delete: DELETEs /me/albums/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await showcaseDelete.execute({ showcaseId: "/showcases/3706071" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url(calls[0]).pathname, "/me/albums/3706071");
  assertEquals(out, { deleted: true, showcaseId: "3706071" });
});

/**
 * A showcase holds references, not containment: Vimeo documents no
 * `should_delete_clips` equivalent here, so there is no destructive flag to
 * offer and none is sent.
 */
test("showcase-delete: sends no body and offers no delete-the-videos flag", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await showcaseDelete.execute({ showcaseId: "1" }, ctx);
  assertEquals(calls[0].body, null);
  const keys = (showcaseDelete.params ?? []).map((p) => p.key);
  assertEquals(keys, ["showcaseId"]);
  assert(!keys.some((k) => /delete/i.test(k)));
});

test("showcase-delete: is a retry-safe perform", () => {
  assertEquals(showcaseDelete.type, "perform");
  assertEquals(showcaseDelete.idempotent, true);
});
