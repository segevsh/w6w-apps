import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-campaign-activity.ts";

Deno.test("get-campaign-activity: GETs /v3/emails/activities/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { campaign_activity_id: "ca1", role: "primary_email", subject: "Hello" },
  }]);
  const out = await action.execute!({ campaignActivityId: "ca1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/emails/activities/ca1");
  assertEquals(out.role, "primary_email");
});

Deno.test("get-campaign-activity: omits `include` by default, keeping the heavy parts off", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ campaignActivityId: "ca1" }, ctx);
  assert(!new URL(calls[0].url).searchParams.has("include"));
});

Deno.test("get-campaign-activity: forwards a comma-separated include list", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    campaignActivityId: "ca1",
    include: "html_content,permalink_url",
  }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("include"),
    "html_content,permalink_url",
  );
});
