import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/invoice-get.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("invoice-get: sends GET /invoices/i1 and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "i1", balanceDue: 10 } }]);
  const out = await action.execute({ invoiceId: "i1" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/invoices/i1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { id: "i1", balanceDue: 10 });
});

Deno.test("invoice-get: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({ invoiceId: "i1" } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
