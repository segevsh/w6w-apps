import { assertEquals, assertRejects } from "@std/assert";
import messageHeaderGet from "../../actions/message-header-get.ts";
import { envelope, mockCtx, pathOf, queryOf, usConnection } from "../_helpers.ts";

Deno.test("message-header-get: fetches raw headers by default value passed through", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope({ messageId: "m1", headerContent: "Subject: Hi\r\n" }) }],
    usConnection({ accountId: "acc-1" }),
  );
  const out = await messageHeaderGet.execute({ folderId: "f1", messageId: "m1", raw: true }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/accounts/acc-1/folders/f1/messages/m1/header");
  assertEquals(queryOf(calls[0].url), { raw: "true" });
  assertEquals(out, { messageId: "m1", headerContent: "Subject: Hi\r\n" });
});

Deno.test("message-header-get: raw=false returns the parsed object shape unchanged", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope({ messageId: "m1", headerContent: { Subject: ["Hi"] } }) }],
    usConnection(),
  );
  const out = await messageHeaderGet.execute({ folderId: "f1", messageId: "m1", raw: false }, ctx);

  assertEquals(queryOf(calls[0].url), { raw: "false" });
  assertEquals(out, { messageId: "m1", headerContent: { Subject: ["Hi"] } });
});

Deno.test("message-header-get: throws when the response carries no headers", async () => {
  const { ctx } = mockCtx(
    [{ body: { status: { code: 200, description: "success" } } }],
    usConnection(),
  );
  await assertRejects(
    async () => {
      await messageHeaderGet.execute({ folderId: "f1", messageId: "m1" }, ctx);
    },
    Error,
    "no headers",
  );
});
