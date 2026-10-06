import { assertEquals } from "@std/assert";
import fieldUpdate from "../../actions/field-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("field-update: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await fieldUpdate.execute({
    "id": 7,
    "name": "x-name",
    "identifier": "x-identifier",
    "description": "x-description",
    "configuration": '{"min": 1}',
    "options": '[{"name": "A", "color": "blue", "displayIndex": 0}]',
    "hidden": true,
    "isSecondaryQuestion": true,
  } as never, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/fields");
  assertEquals(JSON.parse(calls[0].body!), {
    "id": 7,
    "name": "x-name",
    "identifier": "x-identifier",
    "description": "x-description",
    "configuration": { "min": 1 },
    "options": [{ "name": "A", "color": "blue", "displayIndex": 0 }],
    "hidden": true,
    "isSecondaryQuestion": true,
  });
  assertEquals(out, REPLY);
});

Deno.test("field-update: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await fieldUpdate.execute({ "id": 7 } as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), { "id": 7 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("field-update: declares a perform action's idempotency", () => {
  assertEquals(fieldUpdate.type, "perform");
  assertEquals(fieldUpdate.idempotent, true);
  assertEquals(fieldUpdate.params!.filter((p) => p.required).map((p) => p.key), ["id"]);
});
