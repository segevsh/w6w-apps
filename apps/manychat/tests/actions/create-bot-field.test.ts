import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import createBotField from "../../actions/create-bot-field.ts";

const OK = { body: { status: "success", data: { field: { id: 4, name: "promo" } } } };

Deno.test("create-bot-field: sends `name`, NOT `caption`", async () => {
  // The mirror image of create-custom-field, on an adjacent endpoint.
  const { ctx, calls } = mockCtx([OK]);
  await createBotField.execute!({ name: "promo", type: "text" }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/createBotField");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "promo");
  assert(!("caption" in body), "the bot-field endpoint takes `name`");
});

Deno.test("create-bot-field: coerces a boolean-looking initial value", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await createBotField.execute!({ name: "flag", type: "boolean", value: "true" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).value, true);
});

Deno.test("create-bot-field: coerces an integer-looking initial value", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await createBotField.execute!({ name: "stock", type: "number", value: "42" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).value, 42);
});

Deno.test("create-bot-field: leaves a date value as a string", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await createBotField.execute!({ name: "start", type: "date", value: "2026-08-03" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).value, "2026-08-03");
});

Deno.test("create-bot-field: omits an unset value entirely", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await createBotField.execute!({ name: "promo", type: "text" }, ctx);
  assert(!("value" in JSON.parse(calls[0].body!)));
});
