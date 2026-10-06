import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-get.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("contact-get: sends GET /contacts/c1 and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", firstName: "Ann" } }]);
  const out = await action.execute({ contactId: "c1" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/c1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { id: "c1", firstName: "Ann" });
});

Deno.test("contact-get: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({ contactId: "c1" } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
