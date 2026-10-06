import { assertEquals } from "@std/assert";
import fieldListAll from "../../actions/field-list-all.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("field-list-all: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await fieldListAll.execute(
    {
      "page": 7,
      "limit": 7,
      "search": "x-search",
      "inputType": "NUMBER",
      "showSystemFields": "true",
      "inviteeQuestions": "true",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/fields/objects/all");
  assertEquals(queryOf(calls[0].url), {
    "page": "7",
    "limit": "7",
    "search": "x-search",
    "inputType": "NUMBER",
    "showSystemFields": "true",
    "inviteeQuestions": "true",
  });
  assertEquals(out, REPLY);
});

Deno.test("field-list-all: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await fieldListAll.execute({} as never, ctx);

  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("field-list-all: declares a read-only shape", () => {
  assertEquals(fieldListAll.type, "read");
  assertEquals(fieldListAll.idempotent, undefined);
  assertEquals(fieldListAll.params!.filter((p) => p.required).map((p) => p.key), []);
});
