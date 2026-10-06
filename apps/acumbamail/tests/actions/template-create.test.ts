import { assert, assertEquals, assertRejects } from "@std/assert";
import templateCreate from "../../actions/template-create.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-create: POST /api/1/createTemplate/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: 123 }]);
  const out = await templateCreate.execute(
    {
      "template_name": "Welcome",
      "html_content": "<p>Hi</p>",
      "id": 3,
      "custom_category": "Onboarding",
      "subject": "Welcome!",
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/createTemplate/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), {
    "template_name": "Welcome",
    "html_content": "<p>Hi</p>",
    "id": "3",
    "custom_category": "Onboarding",
    "subject": "Welcome!",
  });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { id: "123" });
});

Deno.test("template-create: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await templateCreate.execute(
      {
        "template_name": "Welcome",
        "html_content": "<p>Hi</p>",
        "id": 3,
        "custom_category": "Onboarding",
        "subject": "Welcome!",
      } as never,
      ctx,
    )
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

Deno.test("template-create: an empty template_name fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await templateCreate.execute(
        {
          "template_name": "  ",
          "html_content": "<p>Hi</p>",
          "id": 3,
          "custom_category": "Onboarding",
          "subject": "Welcome!",
        } as never,
        ctx,
      ),
    Error,
    "template_name is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("template-create: unset optional fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: 123 }]);
  await templateCreate.execute(
    { "template_name": "Welcome", "html_content": "<p>Hi</p>" } as never,
    ctx,
  );
  assertEquals(formOf(calls[0]), { "template_name": "Welcome", "html_content": "<p>Hi</p>" });
});
