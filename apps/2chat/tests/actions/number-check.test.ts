import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import numberCheck from "../../actions/number-check.ts";

Deno.test("number-check: keeps the plus signs literal", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "is_valid": true,
      "on_whatsapp": true,
      "whatsapp_info": { "number_id": "17137157533" },
    },
  }]);
  const out = await numberCheck.execute!(
    { "yourNumber": "+595981048477", "numberToCheck": "+17137157533" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.p.2chat.io/open/whatsapp/check-number/+595981048477/+17137157533",
  );
  assertEquals(calls[0].body, null);
  assertEquals((out as { on_whatsapp: boolean }).on_whatsapp, true);
});
