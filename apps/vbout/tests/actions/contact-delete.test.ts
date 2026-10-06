import { assert, assertEquals, assertRejects } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { bodyOf, errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-delete: POSTs emailmarketing/deletecontact.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  const out = await contactDelete.execute({ "id": "3", "listId": "524" } as never, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/deletecontact.json");
  assertEquals(bodyOf(calls[0]), { "id": "3", "listid": "524" });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "ok": true, "data": [] });
});

Deno.test("contact-delete: sends a form-encoded body, not a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  await contactDelete.execute({ "id": "3", "listId": "524" } as never, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("contact-delete: is declared idempotent", () => {
  assertEquals(contactDelete.idempotent, true);
});

Deno.test("contact-delete: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await contactDelete.execute({ "id": "3", "listId": "524" } as never, ctx)
    );
    assert((err as Error).message.includes("bad thing"));
  }
});
