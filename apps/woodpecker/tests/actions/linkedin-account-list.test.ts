import { assertEquals } from "@std/assert";
import linkedinAccountList from "../../actions/linkedin-account-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("linkedin-account-list: filters by session status", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "linkedin_accounts": [{
        "id": 111111,
        "session_status": "CONNECTED",
        "full_name": "Jim Halpert",
      }],
    },
  }]);
  const out = await linkedinAccountList.execute({ "status": "CONNECTED" } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/linkedin_accounts");
  assertEquals(queryOf(calls[0].url), { "status": "CONNECTED" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.count, 1);
});

Deno.test("linkedin-account-list: no accounts is an empty list", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "linkedin_accounts": [] } }]);
  const out = await linkedinAccountList.execute({} as never, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/linkedin_accounts");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.accounts, []);
});
