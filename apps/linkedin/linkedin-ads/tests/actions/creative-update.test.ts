import { assertEquals, assertRejects } from "@std/assert";
import creativeUpdate from "../../actions/creative-update.ts";
import { mockCtx, noContentResponse } from "../_helpers.ts";

Deno.test("creative-update: PARTIAL_UPDATEs by the creative's full URN", async () => {
  const { ctx, calls } = mockCtx([noContentResponse()]);
  const result = await creativeUpdate.execute(
    { accountId: "520866471", creativeId: "119962155", intendedStatus: "ACTIVE" },
    ctx,
  );

  assertEquals(
    calls[0].url,
    "https://api.linkedin.com/rest/adAccounts/520866471/creatives/urn%3Ali%3AsponsoredCreative%3A119962155",
  );
  assertEquals(calls[0].headers["x-restli-method"], "PARTIAL_UPDATE");
  assertEquals(JSON.parse(calls[0].body!), { patch: { $set: { intendedStatus: "ACTIVE" } } });
  assertEquals(result, { ok: true });
});

Deno.test("creative-update: rejects when nothing is set to change, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await creativeUpdate.execute({ accountId: "1", creativeId: "2" }, ctx),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});
