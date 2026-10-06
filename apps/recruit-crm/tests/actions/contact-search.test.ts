import { assertEquals } from "@std/assert";
import action from "../../actions/contact-search.ts";
import { mockCtx, paginator, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-search: maps filters onto /contacts/search", async () => {
  const { ctx, calls } = mockCtx([{ body: paginator([{ slug: "3" }]) }]);
  const out = await action.execute({ firstName: "Bo", email: "bo@x.co" }, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/v1/contacts/search");
  assertEquals(queryOf(calls[0].url), { first_name: "Bo", email: "bo@x.co" });
  assertEquals(out.count, 1);
});

Deno.test("contact-search: last_name and linkedin are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: paginator([]) }]);
  await action.execute({ lastName: "Ng", linkedin: "li" }, ctx);
  assertEquals(queryOf(calls[0].url), { last_name: "Ng", linkedin: "li" });
});
