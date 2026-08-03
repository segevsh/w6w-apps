import { assert, assertEquals, assertRejects } from "@std/assert";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/document-change-status.ts";

Deno.test("document-change-status: PATCHes /documents/{id}/status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute(
    { documentId: "d1", status: 2, note: "signed offline", notifyRecipients: true },
    ctx,
  );

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0]), "/public/v1/documents/d1/status");
  assertEquals(bodyOf(calls[0]), { status: 2, note: "signed offline", notify_recipients: true });
  // 204 No Content — the action echoes what it set rather than inventing a body.
  assertEquals(out, { documentId: "d1", status: 2 });
});

Deno.test("document-change-status: sends only the status when nothing else is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ documentId: "d1", status: 11 }, ctx);
  assertEquals(bodyOf(calls[0]), { status: 11 });
});

Deno.test("document-change-status: offers exactly the four documented target codes", () => {
  const status = action.params?.find((p) => p.key === "status");
  assertEquals(
    (status?.options as Array<{ value: number }>).map((o) => o.value),
    [2, 10, 11, 12],
  );
});

Deno.test("document-change-status: a 409 illegal transition surfaces as an error", async () => {
  const { ctx } = mockCtx([
    { status: 409, body: { type: "conflict_error", detail: "Invalid status transition." } },
  ]);
  const err = await assertRejects(
    async () => {
      await action.execute({ documentId: "d1", status: 11 }, ctx);
    },
    Error,
  );
  assert(err.message.includes("PandaDoc 409"), err.message);
});

Deno.test("document-change-status: a 423 locked document surfaces as an error", async () => {
  const { ctx } = mockCtx([
    { status: 423, body: { type: "document_locked", detail: "Locked for editing." } },
  ]);
  const err = await assertRejects(
    async () => {
      await action.execute({ documentId: "d1", status: 2 }, ctx);
    },
    Error,
  );
  assert(err.message.includes("PandaDoc 423"), err.message);
});

Deno.test("document-change-status: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
