import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-subscriber.ts";

Deno.test("get-subscriber: GETs /api/subscribers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "31986843064993537" } } }]);
  await action.execute!({ identifier: "31986843064993537" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/subscribers/31986843064993537");
});

Deno.test("get-subscriber: accepts an email in the same path position, URL-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ identifier: "dummy@example.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/subscribers/dummy%40example.com");
});

Deno.test("get-subscriber: returns the envelope", async () => {
  const envelope = { data: { id: "1", email: "dummy@example.com" } };
  const { ctx } = mockCtx([{ body: envelope }]);
  assertEquals(await action.execute!({ identifier: "1" }, ctx), envelope);
});
