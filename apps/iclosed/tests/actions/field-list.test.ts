import { assertEquals } from "@std/assert";
import fieldList from "../../actions/field-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("field-list: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await fieldList.execute(
    {
      "objectType": "CONTACT",
      "page": 7,
      "limit": 7,
      "search": "x-search",
      "inputType": "NUMBER",
      "showSystemFields": "true",
      "inviteeQuestions": "true",
      "identifiers": "x-identifiers",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/fields/objects");
  assertEquals(queryOf(calls[0].url), {
    "objectType": "CONTACT",
    "page": "7",
    "limit": "7",
    "search": "x-search",
    "inputType": "NUMBER",
    "showSystemFields": "true",
    "inviteeQuestions": "true",
    "identifiers": "x-identifiers",
  });
  assertEquals(out, REPLY);
});

Deno.test("field-list: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await fieldList.execute({ "objectType": "CONTACT" } as never, ctx);

  assertEquals(queryOf(calls[0].url), { "objectType": "CONTACT" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("field-list: declares a read-only shape", () => {
  assertEquals(fieldList.type, "read");
  assertEquals(fieldList.idempotent, undefined);
  assertEquals(fieldList.params!.filter((p) => p.required).map((p) => p.key), ["objectType"]);
});
