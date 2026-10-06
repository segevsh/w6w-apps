import { assert, assertEquals, assertRejects } from "@std/assert";
import templateList from "../../actions/template-list.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-list: calls GET /api/templates with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ template_id: "t1", title: "NDA" }] } }]);
  const out = await templateList.execute({} as never, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/templates");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assert((out.templates as unknown[]).length === 1, JSON.stringify(out));
});

Deno.test("template-list: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(templateList.execute({} as never, ctx)),
    Error,
  );
  assert(
    err.message.includes("forbidden") && err.message.includes("Invalid or missing"),
    err.message,
  );
});
