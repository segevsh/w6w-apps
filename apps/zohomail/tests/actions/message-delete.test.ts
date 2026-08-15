import { assertEquals } from "@std/assert";
import messageDelete from "../../actions/message-delete.ts";
import { envelope, mockCtx, pathOf, queryOf, usConnection } from "../_helpers.ts";

Deno.test("message-delete: DELETEs the message, no expunge by default", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope({ cId: "c1" }) }],
    usConnection({ accountId: "acc-1" }),
  );
  const out = await messageDelete.execute({ folderId: "f1", messageId: "m1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/accounts/acc-1/folders/f1/messages/m1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { cId: "c1" });
});

Deno.test("message-delete: expunge=true is passed through as a permanent delete", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ cId: "c2" }) }], usConnection());
  await messageDelete.execute({ folderId: "f1", messageId: "m1", expunge: true }, ctx);
  assertEquals(queryOf(calls[0].url), { expunge: "true" });
});

Deno.test("message-delete: is idempotent", () => {
  assertEquals(messageDelete.idempotent, true);
});
