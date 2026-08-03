import { assert, assertEquals } from "@std/assert";
import action from "../../actions/count-data-items.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("count-data-items: POSTs /wix-data/v2/items/count", async () => {
  const { ctx, calls } = mockCtx([{ body: { totalCount: 7 } }]);
  const out = await action.execute!({ dataCollectionId: "Cities" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wix-data/v2/items/count");
  assertEquals(JSON.parse(calls[0].body!), { dataCollectionId: "Cities" });
  assertEquals(out, { totalCount: 7 });
});

Deno.test("count-data-items: sends the filter at the top level, not nested in a query", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ dataCollectionId: "C", filter: { state: "CA" } }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.filter, { state: "CA" });
  assert(!("query" in sent));
});

Deno.test("count-data-items: is a read action", () => {
  assertEquals(action.type, "read");
});
