import { assertEquals, assertRejects } from "@std/assert";
import templateDelete from "../../actions/template-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-delete: sends DELETE to the resource and returns Lob's confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tmpl_abc", deleted: true } }]);
  const out = await templateDelete.execute({ templateId: "tmpl_abc" }, ctx) as {
    id: string;
    deleted: boolean;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/templates/tmpl_abc");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "tmpl_abc", deleted: true });
});

Deno.test("template-delete: is declared idempotent", () => {
  assertEquals(templateDelete.idempotent, true);
});

Deno.test("template-delete: a refused delete surfaces Lob's code", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("not_deletable", "cannot be deleted", 422),
  }]);
  await assertRejects(
    async () => await templateDelete.execute({ templateId: "tmpl_abc" }, ctx),
    Error,
    "not_deletable",
  );
});
