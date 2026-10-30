import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * The one-element `data` array this endpoint documents is unwrapped into a
 * bare object — this is the assertion that keeps the array wrapper invisible
 * to a workflow author.
 */
test("contact-create: POSTs to /v2.1/contacts and unwraps the one-element data array", async () => {
  const { ctx, calls } = mockCtx([
    { body: { status: "success", data: [{ id: 1234, name: "Rachel Green" }] } },
  ]);
  const out = await contactCreate.execute(
    { first_name: "Rachel", contact_number: "12135550000" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2.1/contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(out, { id: 1234, name: "Rachel Green" });
});

test("contact-create: is declared non-idempotent — no dedupe key is documented", () => {
  assertEquals(contactCreate.idempotent, false);
});

test("contact-create: other_numbers accepts a JSON string as well as an array", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [{ id: 1 }] } }]);
  await contactCreate.execute(
    {
      first_name: "Rachel",
      contact_number: "12135550000",
      other_numbers: '[{"label":"Mobile","number":"19876543210"}]',
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.other_numbers, [{ label: "Mobile", number: "19876543210" }]);
});
