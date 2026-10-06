import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-type-list.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("contact-type-list: sends GET /contacts/contact-types and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      count: 2,
      pageSize: 10,
      pageStartIndex: 1,
      items: [{ id: "t2", name: "Vendor", isDefault: false }],
    },
  }]);
  const out = await action.execute({ startIndex: 1 } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/contact-types");
  assertEquals(queryOf(calls[0].url), { pageStartIndex: "1" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, {
    count: 2,
    pageSize: 10,
    pageStartIndex: 1,
    items: [{ id: "t2", name: "Vendor", isDefault: false }],
  });
});

Deno.test("contact-type-list: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({ startIndex: 1 } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
