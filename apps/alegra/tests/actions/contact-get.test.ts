import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { alegraError, assertRejects, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-get: GET /contacts/:id returns the record", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "5" } }]);
  const out = await contactGet.execute({ id: "5", fields: "pdf" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/contacts/5");
  assertEquals(queryOf(calls[0].url).fields, "pdf");
  assertEquals(out, { id: "5" });
});

Deno.test("contact-get: a UUID id is path-encoded as a string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await contactGet.execute({ id: "75c1a5ad-4bd5-4675-b51b-8d6c70f1f2f9" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/contacts/75c1a5ad-4bd5-4675-b51b-8d6c70f1f2f9");
});

Deno.test("contact-get: a blank id is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => contactGet.execute({ id: " " }, ctx), Error, "id is required");
  assertEquals(calls.length, 0);
});

Deno.test("contact-get: a 404 surfaces the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: alegraError(404, "No encontrado") }]);
  await assertRejects(() => contactGet.execute({ id: "1" }, ctx), Error, "No encontrado");
});
