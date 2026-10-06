import { assert, assertEquals, assertRejects } from "@std/assert";
import fieldCreate from "../../actions/field-create.ts";
import { errBody, mockCtx, pathOf } from "../_helpers.ts";

const run = (ctx: Parameters<typeof fieldCreate.execute>[1], input: Record<string, unknown>) =>
  fieldCreate.execute(input as never, ctx) as Promise<unknown>;

Deno.test("field-create: declares a non-idempotent perform action", () => {
  assertEquals(fieldCreate.key, "field-create");
  assertEquals(fieldCreate.type, "perform");
  assertEquals(fieldCreate.idempotent, false);
  assert((fieldCreate.description ?? "").length > 0);
  assert(Array.isArray(fieldCreate.output) && fieldCreate.output.length > 0);
});

Deno.test("field-create: POSTs a one-element array carrying every schema-required member", async () => {
  const reply = { items: [{ name: "plan" }] };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  assertEquals(await run(ctx, { name: " plan ", type: "string", title: "Plan" }), reply);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/fields");
  assertEquals(JSON.parse(calls[0].body!), [
    { name: "plan", type: "string", readOnly: false, array: false, title: "Plan" },
  ]);
});

Deno.test("field-create: format, array and tooltip are sent when set; name and type are required", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await run(ctx, {
    name: "renews",
    type: "string",
    format: "date",
    array: true,
    tooltip: "Renewal date",
  });
  assertEquals(JSON.parse(calls[0].body!), [
    {
      name: "renews",
      type: "string",
      readOnly: false,
      array: true,
      format: "date",
      tooltip: "Renewal date",
    },
  ]);
  await assertRejects(() => run(ctx, { type: "string" }), Error, "name");
  await assertRejects(() => run(ctx, { name: "x" }), Error, "type");
});

Deno.test("field-create: an Encharge failure is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errBody("Field exists") }]);
  await assertRejects(() => run(ctx, { name: "x", type: "string" }), Error, "Field exists");
});
