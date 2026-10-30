import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-lists.ts";

test("list-lists: GETs {site}/lists", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "L1" }] } }]);
  const out = await action.execute({ hostname: "contoso.sharepoint.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/contoso.sharepoint.com/lists");
  assertEquals(out.value, [{ id: "L1" }]);
});

test("list-lists: hidden lists are excluded from $select by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$select"), null);
});

test("list-lists: Include hidden lists adds `system` to $select, per the reference's own wording", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ includeHidden: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$select"), "system");
});

test("list-lists: Include hidden lists is additive to an explicit $select", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ includeHidden: true, select: ["displayName"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$select"), "displayName,system");
});
