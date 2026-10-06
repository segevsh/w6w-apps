import { assertEquals, assertRejects } from "@std/assert";
import formGet from "../../actions/form-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-get: GET /api/forms/{slug}, slug is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 5, name: "My Form" } } }, { body: {} }]);
  const out = await formGet.execute({ form: "kyir3qrg" }, ctx) as { data: { name: string } };
  assertEquals(pathOf(calls[0].url), "/api/forms/kyir3qrg");
  assertEquals(out.data.name, "My Form");
  await formGet.execute({ form: "a/b?x" }, ctx);
  assertEquals(calls[1].url.includes("a%2Fb%3Fx"), true, calls[1].url);
});

Deno.test("form-get: surfaces a 404 with the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("No query results") }]);
  const err = await assertRejects(
    () => Promise.resolve(formGet.execute({ form: "nope" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404") && err.message.includes("No query results"), true);
});
