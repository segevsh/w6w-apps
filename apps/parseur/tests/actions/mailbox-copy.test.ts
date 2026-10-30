import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import mailboxCopy from "../../actions/mailbox-copy.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("mailbox-copy: POSTs /parser/{id}/copy", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 100 } }]);
  const out = await mailboxCopy.execute({ mailboxId: "5" }, ctx) as { result: { id: number } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/parser/5/copy");
  assertEquals(out.result.id, 100);
});

test("mailbox-copy: tolerates an undocumented/empty response body", async () => {
  const { ctx } = mockCtx([{ status: 201, body: undefined }]);
  const out = await mailboxCopy.execute({ mailboxId: "5" }, ctx) as { result: unknown };
  assertEquals(out.result, undefined);
});

test("mailbox-copy: is not idempotent", () => {
  assertEquals(mailboxCopy.idempotent, false);
});
