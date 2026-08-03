import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-subscriber.ts";

Deno.test("update-subscriber: PUTs /api/subscribers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "1" } } }]);
  await action.execute!({ subscriberId: "1", status: "active" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/subscribers/1");
});

Deno.test("update-subscriber: never sends an email field — PUT cannot change the address", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ subscriberId: "1", fields: { name: "Ada" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!).email, undefined);
});

Deno.test("update-subscriber: maps camelCase params onto snake_case body keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({
    subscriberId: "1",
    fields: { name: "Ada" },
    groups: ["42"],
    status: "unsubscribed",
    subscribedAt: "2021-08-31 14:22:08",
    unsubscribedAt: "2021-09-01 09:00:00",
    ipAddress: "1.2.3.4",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    fields: { name: "Ada" },
    groups: ["42"],
    status: "unsubscribed",
    subscribed_at: "2021-08-31 14:22:08",
    unsubscribed_at: "2021-09-01 09:00:00",
    ip_address: "1.2.3.4",
  });
});

Deno.test("update-subscriber: omitting groups leaves membership untouched (no key sent)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ subscriberId: "1", status: "active" }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), ["status"]);
});

Deno.test("update-subscriber: URL-encodes the id path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ subscriberId: "a b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/subscribers/a%20b");
});
