import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/donation-get.ts";

Deno.test("donation-get: GETs /donations/{id}", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: { id: "1", type: "donations", attributes: { amount_in_cents: 5000 } } },
  }]);
  const out = await action.execute({ donationId: "1" }, ctx);
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/donations/1");
  assertEquals(out, { id: "1", type: "donations", amount_in_cents: 5000 });
});
