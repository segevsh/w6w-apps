import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import collectionMerge from "../../actions/collection-merge.ts";
import { bodyOf, mockCtx, okBody, pathOf } from "../_helpers.ts";

test("collection-merge: PUTs /collections/merge with `to` and `ids`", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  const out = await collectionMerge.execute({ to: 66, ids: "8492393, 8364483" }, ctx) as {
    result: boolean;
  };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collections/merge");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { to: 66, ids: [8492393, 8364483] });
  assertEquals(out.result, true);
});

test("collection-merge: refuses an empty id list without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(collectionMerge.execute({ to: 66, ids: "" }, ctx)),
    Error,
  );
  assertEquals(calls.length, 0);
});

/**
 * Destructive of its own inputs: after the first call the merged ids no longer
 * name anything, so a retry is a different request against a changed world.
 */
test("collection-merge: is not idempotent", () => {
  assertEquals(collectionMerge.idempotent, false);
});
