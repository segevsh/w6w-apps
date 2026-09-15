import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/donation-create.ts";

Deno.test("donation-create: POSTs /donations against an existing person", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: { id: "1", type: "donations", attributes: { amount_in_cents: 5000 } } },
  }]);
  const out = await action.execute({ amountInCents: 5000, signupId: "42" }, ctx);
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/donations");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { type: "donations", attributes: { amount_in_cents: 5000, signup_id: "42" } },
  });
  assertEquals(out, { id: "1", type: "donations", amount_in_cents: 5000 });
});

Deno.test("donation-create: can identify the donor by email/name instead of an ID", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{ body: { data: {} } }]);
  await action.execute({
    amountInCents: 2500,
    email: "k@e.com",
    firstName: "Kim",
    lastName: "Possible",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.email, "k@e.com");
  assertEquals(body.data.attributes.first_name, "Kim");
  assertEquals("signup_id" in body.data.attributes, false);
});
