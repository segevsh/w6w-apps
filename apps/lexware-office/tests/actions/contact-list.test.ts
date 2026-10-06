import { assertEquals } from "@std/assert";
import action from "../../actions/contact-list.ts";
import { mockCtx, PAGE, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: maps filters and paging to the vendor's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await action.execute(
    {
      email: "max@gmx.de",
      name: "Mustermann",
      number: 10307,
      customer: "true",
      vendor: "false",
      page: 2,
      size: 100,
    },
    ctx,
  ) as { content: unknown[]; last: boolean };
  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(queryOf(calls[0].url), {
    email: "max@gmx.de",
    name: "Mustermann",
    number: "10307",
    customer: "true",
    vendor: "false",
    page: "2",
    size: "100",
  });
  assertEquals(out.content.length, 1);
  assertEquals(out.last, true);
});

Deno.test("contact-list: page 0 is sent (zero is meaningful); unset filters are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await action.execute({ page: 0 }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "0" });
});
