import { assert, assertEquals, assertRejects } from "@std/assert";
import templateUpdate from "../../actions/template-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-update: calls POST /api/templates/t1 with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "updated" } }]);
  const out = await templateUpdate.execute(
    { templateId: "t1", title: "New" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/templates/t1");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { title: "New" });
  assert(out.status === "updated", JSON.stringify(out));
});

Deno.test("template-update: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(templateUpdate.execute({ templateId: "t1", title: "New" } as never, ctx)),
    Error,
  );
  assert(
    err.message.includes("forbidden") && err.message.includes("Invalid or missing"),
    err.message,
  );
});
