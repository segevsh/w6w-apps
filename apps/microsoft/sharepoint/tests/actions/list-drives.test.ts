import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-drives.ts";

test("list-drives: GETs {site}/drives", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "d1" }] } }]);
  const out = await action.execute({ hostname: "contoso.sharepoint.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/contoso.sharepoint.com/drives");
  assertEquals(out.value, [{ id: "d1" }]);
});

test("list-drives: no site addressed defaults to the tenant root", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/drives");
});

test("list-drives: $top rides as a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ top: 10 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$top"), "10");
});
