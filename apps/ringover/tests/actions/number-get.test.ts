import { assertEquals } from "@std/assert";
import action from "../../actions/number-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("number-get: strips + and spaces from the number", async () => {
  const { ctx, calls } = mockCtx([{ body: { number: 33140000000, is_sms: true } }]);
  const out = await action.execute!({ number: "+33 1 40 00 00 00" }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/numbers/33140000000");
  assertEquals(out, { number: 33140000000, is_sms: true });
});
