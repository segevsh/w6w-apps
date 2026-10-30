import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-groups.ts";

test("list-groups: GETs /groups", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "g1" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/groups");
  assertEquals(out.value.length, 1);
});

test("list-groups: the Microsoft 365 type filter passes through untouched", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ filter: "groupTypes/any(c:c eq 'Unified')" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("$filter"),
    "groupTypes/any(c:c eq 'Unified')",
  );
});

test("list-groups: search is quoted and advanced", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ search: "displayName:Sales" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$search"), '"displayName:Sales"');
  assertEquals(calls[0].headers.consistencylevel, "eventual");
});

test("list-groups: walks pages when all is set", async () => {
  const next = "https://graph.microsoft.com/v1.0/groups?$skiptoken=2";
  const { ctx } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({ all: true }, ctx);
  assertEquals(out.pages, 2);
});
