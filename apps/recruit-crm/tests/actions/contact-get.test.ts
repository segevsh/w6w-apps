import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: GETs /contacts/{id} and returns the record untouched", async () => {
  const { ctx, calls } = mockCtx([{ body: { slug: "42", first_name: "Ada" } }]);
  const out = await action.execute({ contactId: " 42 " }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/42");
  assertEquals(out, { slug: "42", first_name: "Ada" });
});

Deno.test("contact-get: requires an id without calling the API", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await (action.execute({ contactId: "" }, ctx)), Error, "id");
  assertEquals(calls.length, 0);
});

Deno.test("contact-get: a 404 carries the vendor's errorCode and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: true, errorCode: "not_found", errorMessage: "No such record" },
  }]);
  await assertRejects(
    async () => await (action.execute({ contactId: "9" }, ctx)),
    Error,
    "404 not_found for GET /v1/contacts/9: No such record",
  );
});
