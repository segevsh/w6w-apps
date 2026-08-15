import { assertEquals, assertRejects } from "@std/assert";
import messageLabelApply from "../../actions/message-label-apply.ts";
import { mockCtx, pathOf, statusOnly, usConnection } from "../_helpers.ts";

Deno.test("message-label-apply: PUTs mode=applyLabel with messageId and labelId arrays", async () => {
  const { ctx, calls } = mockCtx([{ body: statusOnly() }], usConnection({ accountId: "acc-1" }));
  const out = await messageLabelApply.execute({ messageId: "m1,m2", labelId: "l1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/accounts/acc-1/updatemessage");
  assertEquals(JSON.parse(calls[0].body!), {
    mode: "applyLabel",
    messageId: ["m1", "m2"],
    labelId: ["l1"],
  });
  assertEquals(out, { ok: true });
});

Deno.test("message-label-apply: throws with no labelId, without making a request", async () => {
  const { ctx, calls } = mockCtx([], usConnection());
  await assertRejects(
    async () => {
      await messageLabelApply.execute({ messageId: "m1", labelId: "" }, ctx);
    },
    Error,
    "labelId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("message-label-apply: throws with no messageId, without making a request", async () => {
  const { ctx, calls } = mockCtx([], usConnection());
  await assertRejects(
    async () => {
      await messageLabelApply.execute({ messageId: "", labelId: "l1" }, ctx);
    },
    Error,
    "messageId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("message-label-apply: is idempotent — applying the same label twice has the same effect", () => {
  assertEquals(messageLabelApply.idempotent, true);
});
