import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/candidate-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("candidate-delete: sends DELETE /candidates/{id} and tolerates an empty body", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  const out = await action.execute({ candidateId: "12" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/candidates/12");
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true });
});

Deno.test("candidate-delete: a 404 is an error, not a silent success", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: true, errorMessage: "gone" } }]);
  await assertRejects(
    async () => await (action.execute({ candidateId: "1" }, ctx)),
    Error,
    "gone",
  );
});
