import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-customers.ts";

Deno.test("list-customers: GETs /customers with the filter params mapped", async () => {
  const { ctx, calls } = mockCtx([{
    body: { _embedded: { customers: [{ id: 1, firstName: "Vernon" }] } },
  }]);
  const out = await action.execute({ mailboxId: 85, firstName: "Vernon", page: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/customers");
  assertEquals(url.searchParams.get("mailbox"), "85");
  assertEquals(url.searchParams.get("firstName"), "Vernon");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(out, { customers: [{ id: 1, firstName: "Vernon" }] });
});

Deno.test("list-customers: returns an empty array when _embedded is absent", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await action.execute({}, ctx), { customers: [] });
});
