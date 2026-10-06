import { assertEquals } from "@std/assert";
import campaignList from "../../actions/campaign-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-list: lists campaigns filtered by status", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ "id": 1234567, "name": "SaaS CEOs", "status": "RUNNING" }],
  }]);
  const out = await campaignList.execute({ "status": "RUNNING,PAUSED" } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v1/campaign_list");
  assertEquals(queryOf(calls[0].url), { "status": "RUNNING,PAUSED" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals((out.campaigns as Array<{ name: string }>)[0].name, "SaaS CEOs");
  assertEquals(out.count, 1);
});

Deno.test("campaign-list: an empty match is an empty list, not an error", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "message": "There are no campaigns." } }]);
  const out = await campaignList.execute({} as never, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v1/campaign_list");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.campaigns, []);
  assertEquals(out.message, "There are no campaigns.");
});
