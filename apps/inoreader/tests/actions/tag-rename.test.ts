import { assertEquals, assertRejects } from "@std/assert";
import rename from "../../actions/tag-rename.ts";
import { mockCtx, pathOf, queryOf, text } from "../_helpers.ts";

Deno.test("tag-rename: POSTs s and dest", async () => {
  const { ctx, calls } = mockCtx([text("OK")]);
  const out = await rename.execute({ tag: "user/-/label/Tech", newName: "Technology" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/reader/api/0/rename-tag");
  assertEquals(queryOf(calls[0].url), { s: "user/-/label/Tech", dest: "Technology" });
  assertEquals(out, { ok: true });
});

Deno.test("tag-rename: refuses a slash in the new name and empty fields before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await rename.execute({ tag: "t", newName: "a/b" }, ctx),
    Error,
    "slashes",
  );
  await assertRejects(
    async () => await rename.execute({ tag: "", newName: "b" }, ctx),
    Error,
    "tag is required",
  );
  await assertRejects(
    async () => await rename.execute({ tag: "t", newName: " " }, ctx),
    Error,
    "newName",
  );
  assertEquals(calls.length, 0);
});
