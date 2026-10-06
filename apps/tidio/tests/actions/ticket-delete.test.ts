// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects } from "@std/assert";
import ticketDelete from "../../actions/ticket-delete.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("ticket-delete: DELETE /tickets/3", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await ticketDelete.execute({
    "ticket_id": 3,
  } as any, ctx) as Record<string, any>;
  const items = (out.items ?? []) as Array<Record<string, any>>;
  void items;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/tickets/3");
  assertEquals(calls[0].url.startsWith("https://api.tidio.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.accept, "application/json; version=1");
  assertEquals(calls[0].headers["x-tidio-openapi-client-id"], undefined);
  assertEquals(out.deleted, true);
  assertEquals(out.id, 3);
});

Deno.test("ticket-delete: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ code: "not_found", message: "Nope" }] },
  }]);
  const err = await assertRejects(async () =>
    await ticketDelete.execute({
      "ticket_id": 3,
    } as any, ctx)
  ) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("not_found: Nope"), true);
});
