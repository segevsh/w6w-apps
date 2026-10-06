import { assertEquals, assertRejects } from "@std/assert";
import del from "../../actions/tag-delete.ts";
import { mockCtx, pathOf, queryOf, text } from "../_helpers.ts";

Deno.test("tag-delete: POSTs disable-tag with s", async () => {
  const { ctx, calls } = mockCtx([text("OK")]);
  assertEquals(await del.execute({ tag: "user/-/label/Tech" }, ctx), { ok: true });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/reader/api/0/disable-tag");
  assertEquals(queryOf(calls[0].url), { s: "user/-/label/Tech" });
});

Deno.test("tag-delete: empty tag is rejected; a non-OK body fails", async () => {
  const { ctx } = mockCtx([text("Error=No such tag")]);
  await assertRejects(async () => await del.execute({ tag: "" }, ctx), Error, "tag is required");
  await assertRejects(async () => await del.execute({ tag: "t" }, ctx), Error, "No such tag");
});
