import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-list.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("contact-list: sends GET /contacts and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { count: 1, pageSize: 3, pageStartIndex: 6, items: [{ id: "c1" }] },
  }]);
  const out = await action.execute(
    { pageSize: 3, startIndex: 6, includes: "emailAddress,phoneNumber" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts");
  assertEquals(queryOf(calls[0].url), {
    pageSize: "3",
    pageStartIndex: "6",
    includes: "emailAddress,phoneNumber",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { count: 1, pageSize: 3, pageStartIndex: 6, items: [{ id: "c1" }] });
});

Deno.test("contact-list: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () =>
      await action.execute(
        { pageSize: 3, startIndex: 6, includes: "emailAddress,phoneNumber" } as never,
        ctx,
      ),
    Error,
    "AccuLynx 404",
  );
});
