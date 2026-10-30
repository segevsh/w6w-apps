import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-bases.ts";

test("list-bases: GETs /meta/bases", async () => {
  const body = { bases: [{ id: "appABC", name: "CRM", permissionLevel: "create" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v0/meta/bases");
  assertEquals(result, body);
});

test("list-bases: forwards the offset cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { bases: [] } }]);
  await action.execute!({ offset: "cursor-1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("offset"), "cursor-1");
});

test("list-bases: omits offset when undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: { bases: [] } }]);
  await action.execute!({}, ctx);
  assert(!new URL(calls[0].url).searchParams.has("offset"));
});
