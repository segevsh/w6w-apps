import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-spaces.ts";

test("list-spaces: GETs /v1/spaces with no query when nothing is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { spaces: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://chat.googleapis.com/v1/spaces");
});

test("list-spaces: passes filter, pageSize and pageToken through as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { filter: 'space_type = "SPACE"', pageSize: 50, pageToken: "tok" },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("filter"), 'space_type = "SPACE"');
  assertEquals(p.get("pageSize"), "50");
  assertEquals(p.get("pageToken"), "tok");
});

test("list-spaces: returns the response verbatim", async () => {
  const body = { spaces: [{ name: "spaces/A1" }], nextPageToken: "n" };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({}, ctx), body);
});
