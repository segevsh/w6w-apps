import { assert, assertEquals, assertRejects } from "@std/assert";
import templateCreate from "../../actions/template-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-create: calls POST /api/templates with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ template_id: "t9" }] } }]);
  const out = await templateCreate.execute(
    { title: "NDA", markdown: "# x", labels: "a" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/templates");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { title: "NDA", markdown: "# x", labels: ["a"] });
  assert(out.templateId === "t9", JSON.stringify(out));
});

Deno.test("template-create: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        templateCreate.execute({ title: "NDA", markdown: "# x", labels: "a" } as never, ctx),
      ),
    Error,
  );
  assert(
    err.message.includes("forbidden") && err.message.includes("Invalid or missing"),
    err.message,
  );
});
