import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { alegraError, assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-delete: DELETE /contacts/:id and passes the vendor body through", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 200, message: "ok" } }]);
  const out = await contactDelete.execute({ id: "5" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/contacts/5");
  assertEquals(out, { code: 200, message: "ok" });
});

Deno.test("contact-delete: a success body that carries an `error` key is still a success", async () => {
  const { ctx } = mockCtx([{
    body: { error: "El registro fue eliminado correctamente.", code: 200 },
  }]);
  const out = await contactDelete.execute({ id: "5" }, ctx) as { code: number };
  assertEquals(out.code, 200);
});

Deno.test("contact-delete: a 400 refusal surfaces the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: alegraError(400, "tiene documentos asociados") }]);
  await assertRejects(
    () => contactDelete.execute({ id: "5" }, ctx),
    Error,
    "tiene documentos asociados",
  );
});

Deno.test("contact-delete: a blank id is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => contactDelete.execute({ id: "" }, ctx), Error, "id is required");
  assertEquals(calls.length, 0);
});
