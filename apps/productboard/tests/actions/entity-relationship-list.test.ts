import { assertEquals } from "@std/assert";
import action from "../../actions/entity-relationship-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("entity-relationship-list: GETs the relationships sub-path", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ type: "parent" }]) }]);
  const out = await action.execute({ entityId: "e-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/entities/e-1/relationships");
  assertEquals(out.items.length, 1);
});

Deno.test("entity-relationship-list: target filters use the bracketed spelling", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({
    entityId: "e-1",
    type: "isBlockedBy",
    targetType: "feature",
    targetId: "t-1",
    pageCursor: "cur",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    type: "isBlockedBy",
    "target[type]": "feature",
    "target[id]": "t-1",
    pageCursor: "cur",
  });
});
