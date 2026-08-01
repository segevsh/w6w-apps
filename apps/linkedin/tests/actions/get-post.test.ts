import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-post.ts";

Deno.test("get-post: GETs /rest/posts/{encoded urn} with default viewContext", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "urn:li:share:123", commentary: "hi" } }]);
  const out = await action.execute!({ postUrn: "urn:li:share:123" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/posts/urn%3Ali%3Ashare%3A123");
  assertEquals(url.searchParams.get("viewContext"), "READER");
  assertEquals((out as { id: string }).id, "urn:li:share:123");
});

Deno.test("get-post: passes through an explicit AUTHOR viewContext", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ postUrn: "urn:li:share:123", viewContext: "AUTHOR" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("viewContext"), "AUTHOR");
});
