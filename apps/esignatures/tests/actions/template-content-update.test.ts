import { assert, assertEquals, assertRejects } from "@std/assert";
import templateContentUpdate from "../../actions/template-content-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-content-update: calls POST /api/templates/t1/content with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "updated", data: { markdown: "x" } } }]);
  const out = await templateContentUpdate.execute(
    { templateId: "t1", edits: [{ find_markdown: "a", replace_with_markdown: "" }] } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/templates/t1/content");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    edits: [{ find_markdown: "a", replace_with_markdown: "" }],
  });
  assert(out.status === "updated", JSON.stringify(out));
});

Deno.test("template-content-update: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        templateContentUpdate.execute(
          { templateId: "t1", edits: [{ find_markdown: "a", replace_with_markdown: "" }] } as never,
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
