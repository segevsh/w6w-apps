import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/entity-configuration-list.ts";
import { listEnvelope, mockCtx, pathOf, queryAll } from "../_helpers.ts";

test("entity-configuration-list: GETs the configurations path", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ type: "feature" }]) }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/entities/configurations");
  assertEquals(out.items.length, 1);
  assertEquals(out.hasMore, false);
});

test("entity-configuration-list: types become repeated type[] keys", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ types: ["feature", "initiative"] }, ctx);
  assertEquals(queryAll(calls[0].url, "type[]"), ["feature", "initiative"]);
});

test("entity-configuration-list: offers no pageCursor param, because the endpoint takes none", () => {
  assertEquals(action.params?.map((p) => p.key), ["types"]);
  assertEquals(action.type, "read");
});
