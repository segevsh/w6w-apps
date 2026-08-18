import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/log-list.ts";

Deno.test("log-list: reads the API call log with its filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { logs: [] } }], {
    display: { appId: "APPID" },
  });
  await action.execute!({ length: 50, type: "error", indexName: "products" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/1/logs");
  assertEquals(url.searchParams.get("length"), "50");
  assertEquals(url.searchParams.get("type"), "error");
  assertEquals(url.searchParams.get("indexName"), "products");
});
