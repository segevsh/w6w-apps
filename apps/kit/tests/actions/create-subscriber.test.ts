import { assertEquals } from "@std/assert";
import action from "../../actions/create-subscriber.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("create-subscriber: POSTs only the email address by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { subscriber: { id: 1 } } }]);
  await action.execute!({ emailAddress: "ada@example.com" }, ctx);
  assertEquals(calls[0].url, "https://api.kit.com/v4/subscribers");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { email_address: "ada@example.com" });
});

Deno.test("create-subscriber: maps firstName, state and fields onto Kit's names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { subscriber: {} } }]);
  await action.execute!({
    emailAddress: "ada@example.com",
    firstName: "Ada",
    state: "inactive",
    fields: { last_name: "Lovelace" },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    email_address: "ada@example.com",
    first_name: "Ada",
    state: "inactive",
    fields: { last_name: "Lovelace" },
  });
});

Deno.test("create-subscriber: is marked idempotent — Kit documents it as an upsert", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
