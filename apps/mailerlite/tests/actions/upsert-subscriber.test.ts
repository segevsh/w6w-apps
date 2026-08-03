import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/upsert-subscriber.ts";

Deno.test("upsert-subscriber: POSTs /api/subscribers with just the email", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: "1" } } }]);
  await action.execute!({ email: "dummy@example.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/subscribers");
  assertEquals(JSON.parse(calls[0].body!), { email: "dummy@example.com" });
});

Deno.test("upsert-subscriber: maps camelCase params onto MailerLite's snake_case body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({
    email: "dummy@example.com",
    fields: { name: "Dummy" },
    groups: ["4243829086487936"],
    status: "active",
    subscribedAt: "2021-08-31 14:22:08",
    ipAddress: "1.2.3.4",
    resubscribe: true,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    email: "dummy@example.com",
    fields: { name: "Dummy" },
    groups: ["4243829086487936"],
    status: "active",
    subscribed_at: "2021-08-31 14:22:08",
    ip_address: "1.2.3.4",
    resubscribe: true,
  });
});

Deno.test("upsert-subscriber: omits every unset optional key", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ email: "a@b.com" }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), ["email"]);
});

Deno.test("upsert-subscriber: is declared idempotent — the upsert is non-destructive", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("upsert-subscriber: returns the envelope for both the 201 and 200 outcomes", async () => {
  for (const status of [201, 200]) {
    const { ctx } = mockCtx([{ status, body: { data: { id: "1" } } }]);
    assertEquals(await action.execute!({ email: "a@b.com" }, ctx), { data: { id: "1" } });
  }
});
