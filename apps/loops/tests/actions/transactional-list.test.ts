import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/transactional-list.ts";

Deno.test("transactional-list: lists every template, drafts included", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ id: "t1" }], pagination: { nextCursor: null } },
  }]);
  assertEquals(await action.execute!({}, ctx), [{ id: "t1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/transactional-emails");
});

/** Loops has a second endpoint for the sendable ones; it is the option here. */
Deno.test("transactional-list: published-only is a different endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], pagination: {} } }]);
  await action.execute!({ publishedOnly: true }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/transactional");
});

Deno.test("transactional-list: returnAll follows the cursor", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "a" }], pagination: { nextCursor: "c2" } } },
    { status: 200, body: { data: [{ id: "b" }], pagination: { nextCursor: null } } },
  ]);
  assertEquals((await action.execute!({ returnAll: true }, ctx) as unknown[]).length, 2);
  assertEquals(new URL(calls[1].url).searchParams.get("cursor"), "c2");
});
