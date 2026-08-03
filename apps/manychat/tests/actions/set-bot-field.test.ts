import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import setBotField from "../../actions/set-bot-field.ts";

Deno.test("set-bot-field: by id hits setBotField with a numeric field_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await setBotField.execute!({ fieldId: "7", value: "SUMMER" }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/setBotField");
  assertEquals(JSON.parse(calls[0].body!), { field_id: 7, field_value: "SUMMER" });
});

Deno.test("set-bot-field: by name hits setBotFieldByName", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await setBotField.execute!({ fieldName: "promo", value: "SUMMER" }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/setBotFieldByName");
  assertEquals(JSON.parse(calls[0].body!), { field_name: "promo", field_value: "SUMMER" });
});

Deno.test("set-bot-field: coerces the value the same way on both paths", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }, {
    body: { status: "success" },
  }]);
  await setBotField.execute!({ fieldId: "1", value: "false" }, ctx);
  await setBotField.execute!({ fieldName: "n", value: "12" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).field_value, false);
  assertEquals(JSON.parse(calls[1].body!).field_value, 12);
});

Deno.test("set-bot-field: refuses an ambiguous target without calling the API", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => {
      await setBotField.execute!({ fieldId: "1", fieldName: "n", value: "x" }, ctx);
    },
    Error,
  );
  assert(err.message.includes("exactly one"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("set-bot-field: is idempotent — an absolute write is safe to retry", () => {
  assertEquals(setBotField.idempotent, true);
});
