import { assertEquals, assertRejects } from "@std/assert";
import messageGet from "../../actions/message-get.ts";
import { envelope, mockCtx, pathOf, usConnection } from "../_helpers.ts";

Deno.test("message-get: fetches the message's metadata", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope({ messageId: "m1", subject: "Hi" }) }],
    usConnection({ accountId: "acc-1" }),
  );
  const out = await messageGet.execute(
    { folderId: "f1", messageId: "m1" },
    ctx,
  ) as unknown as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/accounts/acc-1/folders/f1/messages/m1/details");
  assertEquals(out, { messageId: "m1", subject: "Hi" });
});

Deno.test("message-get: throws when the response carries no metadata", async () => {
  const { ctx } = mockCtx(
    [{ body: { status: { code: 200, description: "success" } } }],
    usConnection(),
  );
  await assertRejects(
    async () => {
      await messageGet.execute({ folderId: "f1", messageId: "m1" }, ctx);
    },
    Error,
    "no metadata",
  );
});
