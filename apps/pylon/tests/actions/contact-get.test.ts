import { assertEquals } from "@std/assert";
import action from "../../actions/contact-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-get: GETs /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "c1", email: "a@b.com" } } }]);
  const out = await action.execute!({ id: "c1" }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/contacts/c1");
  assertEquals(out, { id: "c1", email: "a@b.com" });
});
