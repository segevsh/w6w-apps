import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactGet from "../../actions/contact-get.ts";
import { entityBody, mockCtx, pathOf } from "../_helpers.ts";

test("contact-get: reads GET /v1/contacts/{id} and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: entityBody("contact", { id: 710, first_name: "Vicente" }) },
  ]);
  const out = await contactGet.execute({ contactId: "710" }, ctx) as { first_name: string };

  assertEquals(pathOf(calls[0].url), "/v1/contacts/710");
  assertEquals(out.first_name, "Vicente");
});
