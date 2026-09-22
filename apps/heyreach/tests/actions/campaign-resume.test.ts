import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-resume.ts";

Deno.test("campaign-resume: POSTs the campaign id and returns the status only", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const result = await action.execute!({ campaignId: 5 }, ctx);
  assertEquals(calls[0].url, "https://api.heyreach.io/api/public/campaign/Resume?campaignId=5");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  assertEquals(result, { status: 200 });
});

Deno.test("campaign-resume: a 404 is thrown with HeyReach's message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { errorMessage: "Campaign not found" } }]);
  let message = "";
  try {
    await action.execute!({ campaignId: 5 }, ctx);
  } catch (err) {
    message = String(err);
  }
  assertEquals(/Campaign not found/.test(message), true);
});
