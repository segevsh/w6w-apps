import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import setBotFields from "../../actions/set-bot-fields.ts";

Deno.test("set-bot-fields: POSTs the fields array to the batch endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await setBotFields.execute!({
    fields: [{ field_id: 1, field_name: "promo", field_value: "SUMMER" }],
  }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/setBotFields");
  assertEquals(JSON.parse(calls[0].body!), {
    fields: [{ field_id: 1, field_name: "promo", field_value: "SUMMER" }],
  });
});

Deno.test("set-bot-fields: forwards elements verbatim — neither identifier is inferred", async () => {
  // Manychat's schema marks all three required; a name cannot be turned into an
  // id without a lookup that could bind the write to the wrong field.
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await setBotFields.execute!({ fields: [{ field_name: "only-a-name", field_value: "x" }] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).fields[0], {
    field_name: "only-a-name",
    field_value: "x",
  });
});

Deno.test("set-bot-fields: coerces each element's value", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await setBotFields.execute!({
    fields: [
      { field_id: 1, field_value: "true" },
      { field_id: 2, field_value: "5" },
      { field_id: 3, field_value: "2026-08-03" },
    ],
  }, ctx);
  const sent = JSON.parse(calls[0].body!).fields;
  assertEquals(sent[0].field_value, true);
  assertEquals(sent[1].field_value, 5);
  assertEquals(sent[2].field_value, "2026-08-03");
});

Deno.test("set-bot-fields: an absent array degrades to an empty batch, not a crash", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await setBotFields.execute!({} as never, ctx);
  assertEquals(JSON.parse(calls[0].body!), { fields: [] });
});
