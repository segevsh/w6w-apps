import { assertEquals } from "@std/assert";
import phoneNumberGet from "../../actions/phone-number-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("phone-number-get: the number answers bare, with no envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { slug: "14155551234", phone_number: "+14155551234" } }]);
  const out = await phoneNumberGet.execute(
    { phone_number_slug: "14155551234", workspace: "w1" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v2/numbers/14155551234");
  assertEquals(queryOf(calls[0].url), { workspace: "w1" });
  assertEquals(out, { slug: "14155551234", phone_number: "+14155551234" });
});
