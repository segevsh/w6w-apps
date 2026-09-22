import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-create.ts";

const URL_UNDER_TEST = "https://api.heyreach.io/api/public/campaign/Create";

Deno.test("campaign-create: sends only the required trio when nothing else is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { campaignId: 77 } }]);
  const result = await action.execute!({
    name: "Q3 outreach",
    linkedInUserListId: 12,
    linkedInAccountIds: [3, 4],
  }, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), {
    name: "Q3 outreach",
    linkedInUserListId: 12,
    linkedInAccountIds: [3, 4],
  });
  assertEquals(result, { campaignId: 77 });
});

/** The exclusion booleans are meaningful when false, so they are sent when set. */
Deno.test("campaign-create: exclusion flags and a schedule object are passed through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { campaignId: 77 } }]);
  await action.execute!({
    name: "Q3 outreach",
    linkedInUserListId: 12,
    linkedInAccountIds: [3],
    excludeListId: 99,
    excludeContactedFromOtherCampaigns: false,
    excludeHasOtherAccConversations: true,
    schedule: '{"timezone":"UTC"}',
  }, ctx);
  assertEquals(jsonBody(calls[0]), {
    name: "Q3 outreach",
    linkedInUserListId: 12,
    linkedInAccountIds: [3],
    excludeListId: 99,
    excludeContactedFromOtherCampaigns: false,
    excludeHasOtherAccConversations: true,
    schedule: { timezone: "UTC" },
  });
});

Deno.test("campaign-create: a sequence object is sent as JSON, not as a string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { campaignId: 1 } }]);
  await action.execute!({
    name: "n",
    linkedInUserListId: 1,
    linkedInAccountIds: [1],
    sequence: { nodeType: "MESSAGE", actionDelay: 3, actionDelayUnit: "HOUR" },
  }, ctx);
  assertEquals(jsonBody(calls[0]).sequence, {
    nodeType: "MESSAGE",
    actionDelay: 3,
    actionDelayUnit: "HOUR",
  });
});
