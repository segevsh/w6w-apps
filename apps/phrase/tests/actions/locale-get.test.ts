import { assert, assertEquals, assertRejects } from "@std/assert";
import localeGet from "../../actions/locale-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("locale-get: sends GET /v2/projects/project%201%2Fx/locales/locale%201%2Fx", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
    "localeId": "locale 1/x",
    "branch": "v_branch",
  };
  const out = await localeGet.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/projects/project%201%2Fx/locales/locale%201%2Fx");
  assertEquals(queryOf(calls[0].url), { "branch": "v_branch" });
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("locale-get: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await localeGet.execute({
      "projectId": "project 1/x",
      "localeId": "locale 1/x",
      "branch": "v_branch",
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("locale-get: declares key, type and every param it reads", () => {
  assertEquals(localeGet.key, "locale-get");
  assertEquals(localeGet.type, "read");
  const declared = new Set((localeGet.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "localeId": "locale 1/x",
      "branch": "v_branch",
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
