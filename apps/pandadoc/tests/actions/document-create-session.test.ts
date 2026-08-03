import { assertEquals } from "@std/assert";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/document-create-session.ts";

Deno.test("document-create-session: POSTs /documents/{id}/session", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "s1", expires_at: "2026-08-03T16:00:00Z" } },
  ]);
  const out = await action.execute(
    { documentId: "d1", recipient: "a@b.com", lifetime: 900 },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/public/v1/documents/d1/session");
  assertEquals(bodyOf(calls[0]), { recipient: "a@b.com", lifetime: 900 });
  assertEquals(out, { id: "s1", expires_at: "2026-08-03T16:00:00Z" });
});

Deno.test("document-create-session: omits lifetime so PandaDoc's 3600s default applies", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "s1" } }]);
  await action.execute({ documentId: "d1", recipient: "a@b.com" }, ctx);
  assertEquals(bodyOf(calls[0]), { recipient: "a@b.com" });
});

Deno.test("document-create-session: returns the session id verbatim, never a fabricated URL", async () => {
  const { ctx } = mockCtx([{ status: 201, body: { id: "s1", expires_at: "x" } }]);
  const out = await action.execute({ documentId: "d1", recipient: "a@b.com" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(Object.keys(out).sort(), ["expires_at", "id"]);
  assertEquals(action.output, [
    { key: "id", type: "string", label: "Session ID" },
    { key: "expires_at", type: "string", label: "Expires at" },
  ]);
});

Deno.test("document-create-session: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
