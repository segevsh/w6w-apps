import { assertEquals, assertRejects } from "@std/assert";
import invitationAccept from "../../actions/invitation-accept.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("invitation-accept: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await invitationAccept.execute(
    {
      "accountId": "accountId-v",
      "entityUrn": "entityUrn-v",
      "sharedSecret": "sharedSecret-v",
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/network");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "accept",
    "params": { "entity_urn": "entityUrn-v", "shared_secret": "sharedSecret-v" },
  });
});

Deno.test("invitation-accept: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () =>
      await invitationAccept.execute(
        {
          "accountId": "accountId-v",
          "entityUrn": "entityUrn-v",
          "sharedSecret": "sharedSecret-v",
        } as never,
        ctx,
      ),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
