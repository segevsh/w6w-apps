import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/optin-get.ts";

Deno.test("optin-get: GETs the process", async () => {
  const { ctx, calls } = mockCtx([{ body: { listid: 45, name: "p", usesingleoptin: false } }]);
  const out = await action.execute({ listId: 45 }, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/list/45");
  assertEquals(out, { optin: { listid: 45, name: "p", usesingleoptin: false } });
});

Deno.test("optin-get: error 402 is reported", async () => {
  const { ctx } = mockCtx([{ status: 406, body: { error: 402 } }]);
  await assertRejects(
    async () => await action.execute({ listId: 1 }, ctx),
    Error,
    "opt-in process not found",
  );
});
