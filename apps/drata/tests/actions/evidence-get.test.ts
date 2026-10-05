import { assert, assertEquals, assertRejects } from "@std/assert";
import evidenceGet from "../../actions/evidence-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "workspaceId": 7, "evidenceId": 99 };

Deno.test("evidence-get: GET /workspaces/7/evidence/99 returns the bare object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "x" } }]);
  const out = await evidenceGet.execute({ ...INPUT }, ctx) as { id: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/public/v2/workspaces/7/evidence/99");
  assertEquals(calls[0].url.includes("?"), false, "no query unless expand is asked for");
  assertEquals(out.id, 1);
});

Deno.test("evidence-get: expand goes out as repeated expand[] parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await evidenceGet.execute({ ...INPUT, ...{ "expand": ["artifacts"] } }, ctx);

  const wire = [["expand[]", "artifacts"]] as Array<[string, string]>;
  assertEquals(queryOf(calls[0].url).getAll("expand[]"), wire.map(([, v]) => v));
});

Deno.test("evidence-get: a 404 surfaces Drata's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found", 3) }]);
  const err = await assertRejects(
    () => Promise.resolve(evidenceGet.execute({ ...INPUT }, ctx)),
    Error,
  );
  assert(err.message.includes("HTTP 404"), err.message);
  assert(err.message.includes("Not found"), err.message);
});
