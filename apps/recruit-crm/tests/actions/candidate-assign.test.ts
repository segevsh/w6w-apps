import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/candidate-assign.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("candidate-assign: POSTs /candidates/{id}/assign with job_slug in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { candidate_slug: 5, job_slug: 8 } }]);
  const out = await action.execute({ candidateId: "5", jobId: "8" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/candidates/5/assign");
  assertEquals(queryOf(calls[0].url), { job_slug: "8" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { candidate_slug: 5, job_slug: 8 });
});

Deno.test("candidate-assign: needs both ids", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await (action.execute({ candidateId: "5", jobId: "" }, ctx)),
    Error,
    "id",
  );
  assertEquals(calls.length, 0);
});

Deno.test("candidate-assign: a 422 surfaces the raw body when it is not an envelope", async () => {
  const { ctx } = mockCtx([{ status: 422, body: "Unprocessable" }]);
  await assertRejects(
    async () => await (action.execute({ candidateId: "5", jobId: "8" }, ctx)),
    Error,
    "422 for POST /v1/candidates/5/assign: Unprocessable",
  );
});
