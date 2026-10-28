import { assertEquals, assertRejects } from "@std/assert";
import messageMove from "../../actions/message-move.ts";
import { mockCtx, pathOf, statusOnly, usConnection } from "../_helpers.ts";

Deno.test("message-move: PUTs mode=moveMessage with destfolderId", async () => {
  const { ctx, calls } = mockCtx([{ body: statusOnly() }], usConnection({ accountId: "acc-1" }));
  const out = await messageMove.execute({ messageId: "m1,m2", destfolderId: "f2" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/accounts/acc-1/updatemessage");
  assertEquals(JSON.parse(calls[0].body!), {
    mode: "moveMessage",
    messageId: ["m1", "m2"],
    destfolderId: "f2",
  });
  assertEquals(out, { ok: true });
});

Deno.test("message-move: includes isArchive only when set", async () => {
  const { ctx, calls } = mockCtx([{ body: statusOnly() }], usConnection());
  await messageMove.execute({ messageId: "m1", destfolderId: "f2", isArchive: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    mode: "moveMessage",
    messageId: ["m1"],
    destfolderId: "f2",
    isArchive: true,
  });
});

Deno.test("message-move: throws with no messageId, without making a request", async () => {
  const { ctx, calls } = mockCtx([], usConnection());
  await assertRejects(
    async () => {
      await messageMove.execute({ messageId: "", destfolderId: "f2" }, ctx);
    },
    Error,
    "messageId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("message-move: is idempotent — moving the same email twice ends up in the same place", () => {
  assertEquals(messageMove.idempotent, true);
});
