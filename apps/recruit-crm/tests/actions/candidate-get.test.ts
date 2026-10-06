import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/candidate-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("candidate-get: GETs /candidates/{id} and returns the record untouched", async () => {
  const { ctx, calls } = mockCtx([{ body: { slug: "42", first_name: "Ada" } }]);
  const out = await action.execute({ candidateId: " 42 " }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/candidates/42");
  assertEquals(out, { slug: "42", first_name: "Ada" });
});

Deno.test("candidate-get: requires an id without calling the API", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await (action.execute({ candidateId: "" }, ctx)), Error, "id");
  assertEquals(calls.length, 0);
});

Deno.test("candidate-get: a 404 carries the vendor's errorCode and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: true, errorCode: "not_found", errorMessage: "No such record" },
  }]);
  await assertRejects(
    async () => await (action.execute({ candidateId: "9" }, ctx)),
    Error,
    "404 not_found for GET /v1/candidates/9: No such record",
  );
});
