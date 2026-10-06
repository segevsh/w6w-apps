import { assertEquals } from "@std/assert";
import formDelete from "../../actions/form-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-delete: DELETE /forms/{id}, a 204 becomes {deleted:true,id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await formDelete.execute({ formId: "f1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/public/v1/forms/f1");
  assertEquals(out, { deleted: true, id: "f1" });
});

Deno.test("form-delete: a 404 problem surfaces with its code", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { code: "not_found", detail: "No such form", status: 404 },
  }]);
  let msg = "";
  try {
    await formDelete.execute({ formId: "nope" }, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg, "Formspark 404 not_found: No such form");
});
