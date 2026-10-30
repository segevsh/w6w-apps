import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-list.ts";

test("check-list: reads the bare-array check collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "c1", name: "Homepage" }] }]);
  assertEquals(await action.execute!({}, ctx), [{ id: "c1", name: "Homepage" }]);
  assertEquals(new URL(calls[0].url).pathname, "/v1/checks");
  assertEquals(new URL(calls[0].url).searchParams.get("page"), "1");
});

test("check-list: the filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ checkType: "API", tag: "production", search: "home" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("checkType"), "API");
  assertEquals(q.get("tag"), "production");
  assertEquals(q.get("search"), "home");
});

test("check-list: returnAll walks pages until a short one", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ id: `c${i}` }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: full },
    { status: 200, body: [{ id: "last" }] },
  ]);
  assertEquals((await action.execute!({ returnAll: true }, ctx) as unknown[]).length, 101);
  assertEquals(new URL(calls[1].url).searchParams.get("page"), "2");
});
