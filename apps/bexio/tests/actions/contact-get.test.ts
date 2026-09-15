import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: GETs /2.0/contact/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4, name_1: "Acme" } }]);
  const result = await action.execute!({ contactId: 4 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/contact/4");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: 4, name_1: "Acme" });
});
