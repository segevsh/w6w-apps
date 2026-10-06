import { assert, assertEquals, assertRejects } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-invoices.ts";

Deno.test("list-invoices: identity", () => {
  assertEquals(action.key, "list-invoices");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "billing");
});

Deno.test("list-invoices: sends GET /api/v1/billing/invoices", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { metadata: { limit: 25, offset: 0, total: 1 }, items: [{ Uid: "x1" }] },
  }]);
  const result = await action.execute({
    excludeInvoiceUid: "i0",
  } as never, connected(ctx));
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "acme.outseta.com");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/api/v1/billing/invoices");
  assertEquals(url.searchParams.get("excludeInvoiceUid"), "i0");
  assertEquals(calls[0].body, null);
  assertEquals((result as { items: unknown[] }).items.length, 1);
  // The credential is the auth hook's job — no action writes it.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("list-invoices: a failure names the status and the request", async () => {
  const { ctx } = mockCtx([{ status: 404 }]);
  const err = await assertRejects(async () => {
    await action.execute({
      excludeInvoiceUid: "i0",
    } as never, connected(ctx));
  });
  assert((err as Error).message.includes("404"));
  assert((err as Error).message.includes("/api/v1/billing/invoices"));
});
