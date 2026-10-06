import { assert, assertEquals, assertRejects } from "@std/assert";
import templateDelete from "../../actions/template-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-delete: calls POST /api/templates/t1/delete with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "deleted" } }]);
  const out = await templateDelete.execute({ templateId: "t1" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/templates/t1/delete");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assert(out.status === "deleted", JSON.stringify(out));
});

Deno.test("template-delete: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(templateDelete.execute({ templateId: "t1" } as never, ctx)),
    Error,
  );
  assert(
    err.message.includes("forbidden") && err.message.includes("Invalid or missing"),
    err.message,
  );
});
