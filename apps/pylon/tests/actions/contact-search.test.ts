import { assertEquals } from "@std/assert";
import action from "../../actions/contact-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-search: POSTs a filter given as JSON text", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "c1" }] } }]);
  const out = await action.execute!({
    filter: '{"field":"email","operator":"equals","value":"a@b.com"}',
  }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/contacts/search");
  assertEquals(JSON.parse(calls[0].body!), {
    filter: { field: "email", operator: "equals", value: "a@b.com" },
  });
  assertEquals(out, { contacts: [{ id: "c1" }], hasNextPage: false });
});
