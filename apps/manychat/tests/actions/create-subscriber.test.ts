import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import createSubscriber from "../../actions/create-subscriber.ts";

const OK = { body: { status: "success", data: { id: "1" } } };

Deno.test("create-subscriber: POSTs to createSubscriber with snake_case fields", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await createSubscriber.execute!({
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@x.com",
    hasOptInEmail: true,
  }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/subscriber/createSubscriber");
  assertEquals(JSON.parse(calls[0].body!), {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@x.com",
    has_opt_in_email: true,
  });
});

Deno.test("create-subscriber: whatsapp_phone alone is a valid identity", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await createSubscriber.execute!({ whatsappPhone: "+15551234567" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { whatsapp_phone: "+15551234567" });
});

Deno.test("create-subscriber: refuses a body with no identity at all", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => {
      await createSubscriber.execute!({ firstName: "Ada" }, ctx);
    },
    Error,
  );
  assert(err.message.includes("at least one identity"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("create-subscriber: `false` opt-in survives compact — it is a claim, not an absence", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await createSubscriber.execute!({ phone: "+1555", hasOptInSms: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).has_opt_in_sms, false);
});

Deno.test("create-subscriber: does not enforce the consent rules — Manychat owns those", async () => {
  // has_opt_in_sms=true without a consent_phrase is Manychat's to reject; a
  // client-side check that waved compliance through would be worse.
  const { ctx, calls } = mockCtx([OK]);
  await createSubscriber.execute!({ phone: "+1555", hasOptInSms: true }, ctx);
  assertEquals(calls.length, 1);
  assert(!("consent_phrase" in JSON.parse(calls[0].body!)));
});

Deno.test("create-subscriber: is not idempotent", () => {
  assertEquals(createSubscriber.idempotent, false);
});
