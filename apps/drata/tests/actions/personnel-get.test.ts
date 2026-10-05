import { assert, assertEquals, assertRejects } from "@std/assert";
import personnelGet from "../../actions/personnel-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "personnelId": "email:a@b.co" };

Deno.test("personnel-get: GET /personnel/email%3Aa%40b.co returns the bare object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "x" } }]);
  const out = await personnelGet.execute({ ...INPUT }, ctx) as { id: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/public/v2/personnel/email%3Aa%40b.co");
  assertEquals(calls[0].url.includes("?"), false, "no query unless expand is asked for");
  assertEquals(out.id, 1);
});

Deno.test("personnel-get: expand goes out as repeated expand[] parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await personnelGet.execute({ ...INPUT, ...{ "expand": ["user"] } }, ctx);

  const wire = [["expand[]", "user"]] as Array<[string, string]>;
  assertEquals(queryOf(calls[0].url).getAll("expand[]"), wire.map(([, v]) => v));
});

Deno.test("personnel-get: a 404 surfaces Drata's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found", 3) }]);
  const err = await assertRejects(
    () => Promise.resolve(personnelGet.execute({ ...INPUT }, ctx)),
    Error,
  );
  assert(err.message.includes("HTTP 404"), err.message);
  assert(err.message.includes("Not found"), err.message);
});
