import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/job-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-get: GETs /jobs/{id} and returns the record untouched", async () => {
  const { ctx, calls } = mockCtx([{ body: { slug: "42", first_name: "Ada" } }]);
  const out = await action.execute({ jobId: " 42 " }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/jobs/42");
  assertEquals(out, { slug: "42", first_name: "Ada" });
});

Deno.test("job-get: requires an id without calling the API", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await (action.execute({ jobId: "" }, ctx)), Error, "id");
  assertEquals(calls.length, 0);
});

Deno.test("job-get: a 404 carries the vendor's errorCode and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: true, errorCode: "not_found", errorMessage: "No such record" },
  }]);
  await assertRejects(
    async () => await (action.execute({ jobId: "9" }, ctx)),
    Error,
    "404 not_found for GET /v1/jobs/9: No such record",
  );
});
