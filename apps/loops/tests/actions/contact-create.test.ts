import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs the contact fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true, id: "c1" } }]);
  await action.execute!({ email: "ada@example.com", firstName: "Ada" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.loops.so/api/v1/contacts/create");
  // `subscribed` is not sent: the host applies the param default, a bare
  // execute() does not, and Loops subscribes new contacts anyway.
  assertEquals(JSON.parse(calls[0].body!), {
    email: "ada@example.com",
    firstName: "Ada",
  });
});

/** Custom properties sit beside firstName, not under a nested key. */
Deno.test("contact-create: custom properties merge into the top level", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    email: "a@x.com",
    customProperties: '{"plan":"pro","seats":12}',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.plan, "pro");
  assertEquals(body.seats, 12);
  assertEquals(body.customProperties, undefined);
});

Deno.test("contact-create: subscribed false survives, rather than being dropped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ email: "a@x.com", subscribed: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).subscribed, false);
});

Deno.test("contact-create: a custom property may not shadow a built-in field", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!({ email: "a@x.com", customProperties: '{"email":"b@x.com"}' }, ctx),
    Error,
    'may not contain "email"',
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-create: an email is required, and duplicates are refused by Loops", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`email` is required");
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, false);
  assert(action.description!.includes("Update to upsert"), action.description);
});
