import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-list.ts";

const display = { endpoint: "https://example.com:9200" };

Deno.test("index-list: GETs /_cat/indices?format=json with no pattern", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ index: "my-index" }] }], { display });
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/_cat/indices");
  assertEquals(url.searchParams.get("format"), "json");
  assertEquals(result, [{ index: "my-index" }]);
});

Deno.test("index-list: narrows to /_cat/indices/<pattern> when given", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute({ pattern: "logs-*,metrics-*" }, ctx);
  const url = new URL(calls[0].url);
  // The comma is percent-encoded on the way out; decodeURIComponent recovers the
  // original pattern so the assertion isn't coupled to how URL happens to escape it.
  assertEquals(decodeURIComponent(url.pathname), "/_cat/indices/logs-*,metrics-*");
});

Deno.test("index-list: forwards the health filter", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute({ health: "yellow" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("health"), "yellow");
});
