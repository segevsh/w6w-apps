import { assert, assertEquals, assertRejects } from "@std/assert";
import templateContentGet from "../../actions/template-content-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-content-get: calls GET /api/templates/t1/content with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { template_id: "t1", markdown: "# T" } } }]);
  const out = await templateContentGet.execute({ templateId: "t1" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/templates/t1/content");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assert(out.markdown === "# T", JSON.stringify(out));
});

Deno.test("template-content-get: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(templateContentGet.execute({ templateId: "t1" } as never, ctx)),
    Error,
  );
  assert(
    err.message.includes("forbidden") && err.message.includes("Invalid or missing"),
    err.message,
  );
});
