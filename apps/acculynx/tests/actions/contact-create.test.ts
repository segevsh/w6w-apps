import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-create.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("contact-create: sends POST /contacts and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "c9", _link: "https://api.acculynx.com/api/v2/contacts/c9" },
  }]);
  const out = await action.execute(
    {
      firstName: "Ann",
      lastName: "Lee",
      contactTypeIds: ["t1"],
      phoneNumbers: '[{"number":"3135550100","type":"Mobile"}]',
      billingAddressSameAsMailingAddress: true,
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), {
    firstName: "Ann",
    lastName: "Lee",
    billingAddressSameAsMailingAddress: true,
    contactTypeIds: ["t1"],
    phoneNumbers: [{ number: "3135550100", type: "Mobile" }],
  });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { id: "c9", _link: "https://api.acculynx.com/api/v2/contacts/c9" });
});

Deno.test("contact-create: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () =>
      await action.execute(
        {
          firstName: "Ann",
          lastName: "Lee",
          contactTypeIds: ["t1"],
          phoneNumbers: '[{"number":"3135550100","type":"Mobile"}]',
          billingAddressSameAsMailingAddress: true,
        } as never,
        ctx,
      ),
    Error,
    "AccuLynx 404",
  );
});

Deno.test("contact-create: malformed JSON in a json param fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ emailAddresses: "[oops" } as never, ctx),
    Error,
    "emailAddresses is not valid JSON",
  );
  assertEquals(calls.length, 0);
});
