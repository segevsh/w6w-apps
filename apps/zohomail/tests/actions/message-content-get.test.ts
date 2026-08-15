import { assertEquals, assertRejects } from "@std/assert";
import messageContentGet from "../../actions/message-content-get.ts";
import { envelope, mockCtx, pathOf, queryOf, usConnection } from "../_helpers.ts";

Deno.test("message-content-get: fetches the message content", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope({ messageId: "m1", content: "<div>Hello</div>" }) }],
    usConnection({ accountId: "acc-1" }),
  );
  const out = await messageContentGet.execute({ folderId: "f1", messageId: "m1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/accounts/acc-1/folders/f1/messages/m1/content");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { messageId: "m1", content: "<div>Hello</div>" });
});

Deno.test("message-content-get: passes includeBlockContent through", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope({ messageId: "m1", content: "" }) }],
    usConnection(),
  );
  await messageContentGet.execute(
    { folderId: "f1", messageId: "m1", includeBlockContent: true },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), { includeBlockContent: "true" });
});

Deno.test("message-content-get: throws when the response carries no content", async () => {
  const { ctx } = mockCtx(
    [{ body: { status: { code: 200, description: "success" } } }],
    usConnection(),
  );
  await assertRejects(
    async () => {
      await messageContentGet.execute({ folderId: "f1", messageId: "m1" }, ctx);
    },
    Error,
    "no content",
  );
});
