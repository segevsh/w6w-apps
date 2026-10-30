import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import contactMove from "../../actions/contact-move.ts";
import { bodyOf, errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

test("contact-move: POSTs emailmarketing/movecontact.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  const out = await contactMove.execute(
    { "id": "3", "listId": "524", "sourceId": "7" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/movecontact.json");
  assertEquals(bodyOf(calls[0]), { "id": "3", "listid": "524", "sourceid": "7" });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "ok": true, "data": [] });
});

test("contact-move: sends a form-encoded body, not a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  await contactMove.execute({ "id": "3", "listId": "524", "sourceId": "7" } as never, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

test("contact-move: is declared idempotent", () => {
  assertEquals(contactMove.idempotent, true);
});

test("contact-move: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await contactMove.execute({ "id": "3", "listId": "524", "sourceId": "7" } as never, ctx)
    );
    assert((err as Error).message.includes("bad thing"));
  }
});
