import { assertEquals } from "@std/assert";
import action from "../../actions/customer-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("customer-list: GETs /customers with paging, filter and sort", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      collection: [{ n: 1 }],
      pagination: { results: 7, skipPages: 2, nextPage: "https://x/next" },
    },
  }]);
  const out = await action.execute!(
    { filter: "name$like:a", sort: "-name", pageSize: 5000, skipPages: 2 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://restapi.e-conomic.com/customers");
  assertEquals(url.searchParams.get("filter"), "name$like:a");
  assertEquals(url.searchParams.get("sort"), "-name");
  assertEquals(url.searchParams.get("pagesize"), "1000");
  assertEquals(url.searchParams.get("skippages"), "2");
  assertEquals(out, { items: [{ n: 1 }], count: 1, total: 7, hasMore: true, nextSkipPages: 3 });
});

Deno.test("customer-list: the last page has no nextSkipPages", async () => {
  const { ctx, calls } = mockCtx([{ body: { collection: [], pagination: { results: 0 } } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("pagesize"), "100");
  assertEquals(out, { items: [], count: 0, total: 0, hasMore: false });
});

Deno.test("customer-list: an API error is thrown with the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "bad filter", httpStatusCode: 400 } }]);
  let msg = "";
  try {
    await action.execute!({ filter: "x" }, ctx);
  } catch (e) {
    msg = String(e);
  }
  assertEquals(msg.includes("bad filter") && msg.includes("HTTP 400"), true);
});
