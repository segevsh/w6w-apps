import { assertEquals } from "@std/assert";
import fieldCreate from "../../actions/field-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("field-create: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await fieldCreate.execute({
    "name": "x-name",
    "inputType": "NUMBER",
    "type": "CONTACT",
    "identifier": "x-identifier",
    "description": "x-description",
    "configuration": '{"min": 1}',
    "options": '[{"name": "A", "color": "blue", "displayIndex": 0}]',
    "isSecondaryQuestion": true,
  } as never, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/fields");
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "x-name",
    "inputType": "NUMBER",
    "type": "CONTACT",
    "identifier": "x-identifier",
    "description": "x-description",
    "configuration": { "min": 1 },
    "options": [{ "name": "A", "color": "blue", "displayIndex": 0 }],
    "isSecondaryQuestion": true,
  });
  assertEquals(out, REPLY);
});

Deno.test("field-create: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await fieldCreate.execute(
    { "name": "x-name", "inputType": "NUMBER", "type": "CONTACT" } as never,
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), {
    "name": "x-name",
    "inputType": "NUMBER",
    "type": "CONTACT",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("field-create: declares a perform action's idempotency", () => {
  assertEquals(fieldCreate.type, "perform");
  assertEquals(fieldCreate.idempotent, false);
  assertEquals(fieldCreate.params!.filter((p) => p.required).map((p) => p.key), [
    "name",
    "inputType",
    "type",
  ]);
});
