import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/delete-tag.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("delete-tag: sends the name", async () => {
  const { ctx, calls } = mockCtx([{ body: "" }]);
  const out = await action.execute({ name: "docs_feedback" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/configuration/action/delete_tag");
  assertEquals(JSON.parse(calls[0].body!), { name: "docs_feedback" });
  assertEquals(out, { deleted: true });
});

Deno.test("delete-tag: name required; not_found surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { type: "not_found", message: "Not found" } },
  }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`name` is required");
  await assertRejects(async () => await action.execute({ name: "gone" }, ctx), Error, "not_found");
});
