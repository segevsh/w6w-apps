import { assertEquals } from "@std/assert";
import blacklistEmailList from "../../actions/blacklist-email-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("blacklist-email-list: GET /rest/v2/blacklist/emails", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "emails": ["a.com", "b.io"], "total": 2 },
  }]);
  const out = await blacklistEmailList.execute(
    { "email_filter": "woodpecker*", "per_page": 50 } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/blacklist/emails");
  assertEquals(queryOf(calls[0].url), { "email_filter": "woodpecker*", "per_page": "50" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.emails, ["a.com", "b.io"]);
  assertEquals(out.total, 2);
});
