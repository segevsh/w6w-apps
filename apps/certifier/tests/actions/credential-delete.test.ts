import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/credential-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("credential-delete: DELETE /v1/credentials/{id}; 204 becomes { deleted, id }", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ credentialId: "c1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/credentials/c1");
  assertEquals(out, { deleted: true, id: "c1" });
});

Deno.test("credential-delete: a second delete's 404 is surfaced, not swallowed", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("not_found", "gone") }]);
  await assertRejects(async () => await action.execute({ credentialId: "c1" }, ctx), Error, "404");
});
