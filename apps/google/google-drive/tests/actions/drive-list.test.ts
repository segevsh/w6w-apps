import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/drive-list.ts";

test("drive-list: GETs /drives with default pageSize=100", async () => {
  const body = { drives: [{ id: "drv-1" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/drive/v3/drives");
  assertEquals(url.searchParams.get("pageSize"), "100");
  assertEquals(result, body);
});
