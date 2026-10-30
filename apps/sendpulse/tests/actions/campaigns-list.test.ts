import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaigns-list.ts";

test("campaigns-list: GETs /campaigns with default limit/offset", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/campaigns?limit=100&offset=0");
});
