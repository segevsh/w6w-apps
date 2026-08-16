import { assertEquals } from "@std/assert";
import creativeGet from "../../actions/creative-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("creative-get: addresses the creative by its full URN, percent-encoded in the path", async () => {
  const body = { id: "urn:li:sponsoredCreative:119962155", intendedStatus: "DRAFT" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await creativeGet.execute(
    { accountId: "520866471", creativeId: "119962155" },
    ctx,
  );

  assertEquals(
    calls[0].url,
    "https://api.linkedin.com/rest/adAccounts/520866471/creatives/urn%3Ali%3AsponsoredCreative%3A119962155",
  );
  assertEquals(result, body);
});

Deno.test("creative-get: also accepts a full URN as input without double-prefixing", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await creativeGet.execute(
    { accountId: "1", creativeId: "urn:li:sponsoredCreative:119962155" },
    ctx,
  );
  assertEquals(
    calls[0].url,
    "https://api.linkedin.com/rest/adAccounts/1/creatives/urn%3Ali%3AsponsoredCreative%3A119962155",
  );
});
