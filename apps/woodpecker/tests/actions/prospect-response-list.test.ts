import { assertEquals } from "@std/assert";
import prospectResponseList from "../../actions/prospect-response-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("prospect-response-list: GET /rest/v2/prospects/{id}/responses", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "prospect_id": 123456789,
      "email": "jared@piedpiper.com",
      "responses": [{ "response_id": 1, "subject": "Re: Hi" }],
    },
  }]);
  const out = await prospectResponseList.execute(
    { "prospect_id": "123456789", "campaign_id": "1,2" } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/prospects/123456789/responses");
  assertEquals(queryOf(calls[0].url), { "campaign_id": "1,2" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.count, 1);
  assertEquals(out.email, "jared@piedpiper.com");
});
