import { assertEquals, assertRejects } from "@std/assert";
import itemIds from "../../actions/item-ids.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("item-ids: stream id is the `s` QUERY parameter and ids are extracted", async () => {
  const body = {
    itemRefs: [{ id: "3614359203", timestampUsec: "1" }, { id: "3614347074", timestampUsec: "2" }],
    continuation: "aDRT",
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await itemIds.execute({ streamId: "user/-/label/MTB" }, ctx);
  assertEquals(pathOf(calls[0].url), "/reader/api/0/stream/items/ids");
  assertEquals(queryOf(calls[0].url), { s: "user/-/label/MTB", output: "json" });
  assertEquals(out, {
    itemRefs: body.itemRefs,
    ids: ["3614359203", "3614347074"],
    continuation: "aDRT",
  });
});

Deno.test("item-ids: maps options to n, r, ot, xt, it, c, includeAllDirectStreamIds", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await itemIds.execute({
    streamId: "s",
    count: 1000,
    order: "oldest",
    newerThan: 5,
    excludeRead: true,
    onlyLabel: "like",
    continuation: "c1",
    onlyManualTags: true,
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    s: "s",
    n: "1000",
    r: "o",
    ot: "5",
    xt: "user/-/state/com.google/read",
    it: "user/-/state/com.google/like",
    c: "c1",
    output: "json",
    includeAllDirectStreamIds: "false",
  });
  assertEquals(out, { itemRefs: [], ids: [], continuation: undefined });
});

Deno.test("item-ids: requires a stream id", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await itemIds.execute({ streamId: " " }, ctx), Error, "streamId");
});
