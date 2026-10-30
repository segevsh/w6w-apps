import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import findContactByEmail from "../../actions/find-contact-by-email.ts";
import { item, mockCtx, pathOf } from "../_helpers.ts";

test("find-contact-by-email: hits GET /v1/contacts/find_by_email/:email", async () => {
  const { ctx, calls } = mockCtx([{
    body: item("74", "contact", { email: "roey@lawmatics.com" }),
  }]);
  const out = await findContactByEmail.execute(
    { email: "roey@lawmatics.com" },
    ctx,
  ) as { id: string };

  assertEquals(pathOf(calls[0].url), "/v1/contacts/find_by_email/roey%40lawmatics.com");
  assertEquals(out.id, "74");
});
