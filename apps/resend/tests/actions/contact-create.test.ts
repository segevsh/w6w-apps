import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

const display = {};

/** The audience is a body field on the current top-level endpoint, not a path segment. */
Deno.test("contact-create: posts to /contacts with audience_id in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "c_1" } }], { display });
  await action.execute!({
    email: "a@b.com",
    firstName: "Ann",
    audienceId: "aud_1",
  }, ctx);
  assertEquals(calls[0].url, "https://api.resend.com/contacts");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "a@b.com",
    first_name: "Ann",
    audience_id: "aud_1",
  });
});

Deno.test("contact-create: unsubscribed is only sent when explicitly true", async () => {
  const off = mockCtx([{ status: 201, body: {} }], { display });
  await action.execute!({ email: "a@b.com" }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!).unsubscribed, undefined);

  const on = mockCtx([{ status: 201, body: {} }], { display });
  await action.execute!({ email: "a@b.com", unsubscribed: true }, on.ctx);
  assertEquals(JSON.parse(on.calls[0].body!).unsubscribed, true);
});

Deno.test("contact-create: an email is required", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`email`");
  assertEquals(calls.length, 0);
});
