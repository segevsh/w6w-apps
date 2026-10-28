import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/find-direct-message.ts";

Deno.test("find-direct-message: sends the user resource name as a QUERY param", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/D1" } }]);
  await action.execute!({ user: "123456789" }, ctx);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  // `name` is a query parameter on this method, not a path segment.
  assertEquals(url.pathname, "/v1/spaces:findDirectMessage");
  assertEquals(url.searchParams.get("name"), "users/123456789");
});

Deno.test("find-direct-message: accepts an already-qualified users/{user} name", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ user: "users/123456789" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("name"), "users/123456789");
});

Deno.test("find-direct-message: does not double-encode — URLSearchParams owns the encoding", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ user: "person@example.com" }, ctx);
  // Raw query string is encoded once; decoding it once returns the literal name.
  assertEquals(new URL(calls[0].url).searchParams.get("name"), "users/person@example.com");
});
