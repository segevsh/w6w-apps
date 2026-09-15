import { assertEquals, assertRejects } from "@std/assert";
import mailboxGet from "../../actions/mailbox-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("mailbox-get: GETs /parser/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, name: "Invoices" } }]);
  const out = await mailboxGet.execute({ mailboxId: "42" }, ctx) as { id: number };

  assertEquals(pathOf(calls[0].url), "/parser/42");
  assertEquals(out.id, 42);
});

Deno.test("mailbox-get: a 404 surfaces the vendor's non_field_errors message", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody("No Parser matches the given query.") },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(mailboxGet.execute({ mailboxId: "999" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("No Parser matches the given query."), true, err.message);
});
