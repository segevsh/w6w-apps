import { assertEquals } from "@std/assert";
import action from "../../actions/blacklist-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("blacklist-list: GETs /blacklists/numbers", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      blacklist_list_count: 1,
      total_blacklist_count: 3,
      blacklist_list: [{ number: 33612345678 }],
    },
  }]);
  const out = await action.execute!({ limitCount: 1 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/blacklists/numbers");
  assertEquals(url.searchParams.get("limit_count"), "1");
  assertEquals(out, { numbers: [{ number: 33612345678 }], count: 1, total: 3 });
});

Deno.test("blacklist-list: a 204 is an empty list", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({}, ctx), { numbers: [], count: 0, total: 0 });
});
