import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: reads GET /v2/contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 501, firstName: "Jane", companyId: 2001 } }]);
  const result = await contactGet.execute({ contactId: 501 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/contacts/501");
  assertEquals(result.companyId, 2001);
});
