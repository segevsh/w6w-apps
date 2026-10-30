import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import setSubscriberField from "../../actions/set-subscriber-field.ts";

test("set-subscriber-field: by id hits setCustomField", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await setSubscriberField.execute!({ subscriberId: "1", fieldId: "7", value: "pro" }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/subscriber/setCustomField");
  assertEquals(JSON.parse(calls[0].body!), {
    subscriber_id: "1",
    field_id: 7,
    field_value: "pro",
  });
});

test("set-subscriber-field: by name hits setCustomFieldByName", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await setSubscriberField.execute!({ subscriberId: "1", fieldName: "Plan", value: "pro" }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/subscriber/setCustomFieldByName");
  assertEquals(JSON.parse(calls[0].body!).field_name, "Plan");
});

test("set-subscriber-field: a boolean field gets a real boolean, not the string", async () => {
  // The bug coerceFieldValue exists to prevent.
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await setSubscriberField.execute!({ subscriberId: "1", fieldName: "vip", value: "true" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).field_value, true);
});

test("set-subscriber-field: a date value stays a string", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await setSubscriberField.execute!(
    { subscriberId: "1", fieldName: "renews", value: "2026-08-03" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).field_value, "2026-08-03");
});

test("set-subscriber-field: refuses an ambiguous field target", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => {
      await setSubscriberField.execute!(
        { subscriberId: "1", fieldId: "1", fieldName: "n", value: "x" },
        ctx,
      );
    },
    Error,
  );
  assert(err.message.includes("exactly one"), err.message);
  assertEquals(calls.length, 0);
});

test("set-subscriber-field: is idempotent", () => {
  assertEquals(setSubscriberField.idempotent, true);
});
