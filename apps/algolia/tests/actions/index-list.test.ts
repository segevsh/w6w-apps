import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-list.ts";

Deno.test("index-list: reads the index collection from the DSN host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [{ name: "products" }] } }], {
    display: { appId: "APPID" },
  });
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://appid-dsn.algolia.net/1/indexes");
  assertEquals(result, { items: [{ name: "products" }] });
});
