import { assertEquals } from "@std/assert";
import mailboxCopy from "../../actions/mailbox-copy.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("mailbox-copy: POSTs /parser/{id}/copy", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 100 } }]);
  const out = await mailboxCopy.execute({ mailboxId: "5" }, ctx) as { result: { id: number } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/parser/5/copy");
  assertEquals(out.result.id, 100);
});

Deno.test("mailbox-copy: tolerates an undocumented/empty response body", async () => {
  const { ctx } = mockCtx([{ status: 201, body: undefined }]);
  const out = await mailboxCopy.execute({ mailboxId: "5" }, ctx) as { result: unknown };
  assertEquals(out.result, undefined);
});

Deno.test("mailbox-copy: is not idempotent", () => {
  assertEquals(mailboxCopy.idempotent, false);
});
