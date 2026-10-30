import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import numberCheck from "../../actions/number-check.ts";

test("number-check: keeps the plus signs literal", async () => {
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
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(
    calls[0].url,
    "https://api.p.2chat.io/open/whatsapp/check-number/+595981048477/+17137157533",
  );
  assert.deepStrictEqual(calls[0].body, null);
  assert.deepStrictEqual((out as { on_whatsapp: boolean }).on_whatsapp, true);
});
