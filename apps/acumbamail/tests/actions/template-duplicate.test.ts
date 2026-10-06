import { assert, assertEquals, assertRejects } from "@std/assert";
import templateDuplicate from "../../actions/template-duplicate.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-duplicate: POST /api/1/duplicateTemplate/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: 123 }]);
  const out = await templateDuplicate.execute(
    { "template_name": "Welcome copy", "origin_template_id": "3" } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/duplicateTemplate/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), { "template_name": "Welcome copy", "origin_template_id": "3" });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { id: "123" });
});

Deno.test("template-duplicate: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await templateDuplicate.execute(
      { "template_name": "Welcome copy", "origin_template_id": "3" } as never,
      ctx,
    )
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

Deno.test("template-duplicate: an empty template_name fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await templateDuplicate.execute(
        { "template_name": "  ", "origin_template_id": "3" } as never,
        ctx,
      ),
    Error,
    "template_name is required",
  );
  assertEquals(calls.length, 0);
});
