import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import listBotFields from "../../actions/list-bot-fields.ts";

Deno.test("list-bot-fields: GETs the bot fields endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [] } }]);
  await listBotFields.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/getBotFields");
});

Deno.test("list-bot-fields: unlike custom fields, values come back inline", async () => {
  // There is only one value per bot field, so the listing can carry it.
  const { ctx } = mockCtx([
    {
      body: {
        status: "success",
        data: [{ id: 1, name: "promo", type: "text", description: "", value: "SUMMER" }],
      },
    },
  ]);
  const out = await listBotFields.execute!({}, ctx) as { data: Array<{ value: unknown }> };
  assert("value" in out.data[0]);
  assertEquals(out.data[0].value, "SUMMER");
});

Deno.test("list-bot-fields: is a distinct resource from custom-field", () => {
  assertEquals(listBotFields.resource, "bot-field");
});
