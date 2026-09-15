import { assertEquals } from "@std/assert";
import mailboxDelete from "../../actions/mailbox-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("mailbox-delete: DELETEs /parser/{id} and returns the async acknowledgement", async () => {
  const { ctx, calls } = mockCtx([
    { body: { notification_set: { info: ["Mailbox is being deleted. This can take a while."] } } },
  ]);
  const out = await mailboxDelete.execute({ mailboxId: "7" }, ctx) as {
    mailboxId: string;
    notification_set: { info: string[] };
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/parser/7");
  assertEquals(out.mailboxId, "7");
  assertEquals(out.notification_set.info, ["Mailbox is being deleted. This can take a while."]);
});

Deno.test("mailbox-delete: is idempotent", () => {
  assertEquals(mailboxDelete.idempotent, true);
});
