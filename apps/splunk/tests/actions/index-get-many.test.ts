import { assertEquals } from "@std/assert";
import { mockSplunkCtx } from "../_helpers.ts";
import action from "../../actions/index-get-many.ts";

Deno.test("index-get-many: GETs /services/data/indexes with datatype", async () => {
  const { ctx, calls } = mockSplunkCtx([{ body: { entry: [] } }]);
  await action.execute({ count: 30, offset: 0, datatype: "all" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/services/data/indexes");
  assertEquals(url.searchParams.get("datatype"), "all");
});

Deno.test("index-get-many: defaults to event indexes when datatype is unset", async () => {
  const { ctx, calls } = mockSplunkCtx([{ body: { entry: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("datatype"), false);
});
