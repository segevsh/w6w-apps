import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-jobs-list.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("contact-jobs-list: sends GET /contacts/c1/jobs and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { count: 2, pageSize: 1, pageStartIndex: 0, items: [{ id: "j1" }] },
  }]);
  const out = await action.execute({ contactId: "c1", pageSize: 1 } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/c1/jobs");
  assertEquals(queryOf(calls[0].url), { pageSize: "1" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { count: 2, pageSize: 1, pageStartIndex: 0, items: [{ id: "j1" }] });
});

Deno.test("contact-jobs-list: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({ contactId: "c1", pageSize: 1 } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
