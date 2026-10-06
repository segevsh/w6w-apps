import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-structured-content.ts";

Deno.test("get-structured-content: published by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { modules: [] } }]);
  await action.execute!({ eventId: "5" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/events/5/structured_content/");
  assert(!url.searchParams.has("purpose"));
});

Deno.test("get-structured-content: working version hits /edit/ with purpose", async () => {
  const { ctx, calls } = mockCtx([{ body: { modules: [] } }]);
  await action.execute!({ eventId: "5", version: "working", purpose: "digital_content" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/events/5/structured_content/edit/");
  assertEquals(url.searchParams.get("purpose"), "digital_content");
});
