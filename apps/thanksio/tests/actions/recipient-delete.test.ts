import { assert, assertEquals, assertRejects } from "@std/assert";
import recipientDelete from "../../actions/recipient-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("recipient-delete: calls DELETE /api/v2/recipients/99 and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "Recipient 99 Deleted" } }]);
  const out = await recipientDelete.execute({ "recipientId": "99" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/recipients/99");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assert(
    (out.result as Record<string, string>).status === "Recipient 99 Deleted",
    JSON.stringify(out),
  );
});

Deno.test("recipient-delete: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { "message": "Not Found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(recipientDelete.execute({ "recipientId": "99" } as never, ctx)),
    Error,
  );
  assert(err.message.includes("HTTP 404") && err.message.includes("Not Found"), err.message);
});
