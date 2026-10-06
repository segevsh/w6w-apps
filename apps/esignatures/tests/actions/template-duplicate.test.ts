import { assert, assertEquals, assertRejects } from "@std/assert";
import templateDuplicate from "../../actions/template-duplicate.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-duplicate: calls POST /api/templates/t1/duplicate with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ template_id: "t2" }] } }]);
  const out = await templateDuplicate.execute(
    {
      templateId: "t1",
      title: "Copy",
      placeholderFields: [{ placeholder_key: "k", replace_with_text: "v" }],
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/templates/t1/duplicate");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Copy",
    placeholder_fields: [{ placeholder_key: "k", replace_with_text: "v" }],
  });
  assert(out.templateId === "t2", JSON.stringify(out));
});

Deno.test("template-duplicate: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        templateDuplicate.execute(
          {
            templateId: "t1",
            title: "Copy",
            placeholderFields: [{ placeholder_key: "k", replace_with_text: "v" }],
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(
    err.message.includes("forbidden") && err.message.includes("Invalid or missing"),
    err.message,
  );
});
