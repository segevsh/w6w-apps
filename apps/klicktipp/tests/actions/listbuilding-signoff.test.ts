import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/listbuilding-signoff.ts";

Deno.test("listbuilding-signoff: POSTs only the email (the key is added by sign)", async () => {
  const { ctx, calls } = mockCtx([{ body: [true] }]);
  const out = await action.execute({ email: "a@example.com" }, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/subscriber/signoff");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@example.com" });
  assertEquals(out, { success: true });
});

Deno.test("listbuilding-signoff: error 100 means the key is invalid", async () => {
  const { ctx } = mockCtx([{ status: 406, body: { error: 100 } }]);
  await assertRejects(
    async () => await action.execute({ email: "a@example.com" }, ctx),
    Error,
    "invalid API key",
  );
});
