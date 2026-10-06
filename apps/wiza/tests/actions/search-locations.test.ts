import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/search-locations.ts";
import { exec, mockCtx } from "../_helpers.ts";

Deno.test("search-locations: GETs the autocomplete with the query and wraps data", async () => {
  const data = [{ key: "Toronto, Ontario, Canada", bucket: "city", count: 100 }];
  const { ctx, calls } = mockCtx([{ body: { status: 200, data } }]);
  const out = await exec(action, { query: "Tor" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://wiza.co/api/meta/location_autocomplete?query=Tor");
  assertEquals(out, { locations: data });
});

Deno.test("search-locations: under 3 characters is refused locally", async () => {
  const none = mockCtx();
  await assertRejects(() => exec(action, { query: " To " }, none.ctx), Error, "at least 3");
  assertEquals(none.calls.length, 0);
});

Deno.test("search-locations: a 400 from the vendor surfaces its message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { status: { code: 400, message: "Query is required" } },
  }]);
  await assertRejects(() => exec(action, { query: "abc" }, ctx), Error, "Query is required");
});
