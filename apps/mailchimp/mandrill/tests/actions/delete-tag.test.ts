import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-tag.ts";

Deno.test("delete-tag: POSTs /tags/delete.json with the tag name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { tag: "welcome" } }]);
  await action.execute!({ tag: "welcome" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/tags/delete.json");
  assertEquals(JSON.parse(calls[0].body!), { tag: "welcome" });
});
