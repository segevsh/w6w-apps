import { assertEquals, assertRejects } from "@std/assert";
import mailboxUpdate from "../../actions/mailbox-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("mailbox-update: PUTs /parser/{id} with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7, name: "Renamed" } }]);
  await mailboxUpdate.execute({ mailboxId: "7", name: "Renamed" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/parser/7");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});

Deno.test("mailbox-update: a 409 address conflict surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([
    {
      status: 409,
      body: errorBody("A mailbox with that address already exists. Please choose another address."),
    },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(mailboxUpdate.execute({ mailboxId: "7", name: "dup" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("already exists"), true, err.message);
});

Deno.test("mailbox-update: is idempotent", () => {
  assertEquals(mailboxUpdate.idempotent, true);
});
