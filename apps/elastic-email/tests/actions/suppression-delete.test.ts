import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/suppression-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("suppression-delete: DELETE /suppressions/{email}", async () => {
  const { ctx, calls } = mockCtx([{ body: "" }]);
  const out = await action.execute({ email: "a@x.com" }, ctx);
  assertEquals(out, { deleted: true, email: "a@x.com" });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v4/suppressions/a%40x.com");
});

Deno.test("suppression-delete: email required", async () => {
  await assertRejects(async () => await action.execute({}, mockCtx().ctx), Error, "required");
});
