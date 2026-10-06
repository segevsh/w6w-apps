import { assertEquals } from "@std/assert";
import prospectList from "../../actions/prospect-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("prospect-list: lists with filters and reads X-Total-Count", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ "id": 1, "email": "erlich@bachmanity.com", "status": "ACTIVE" }],
    headers: { "x-total-count": "41", "content-type": "application/json" },
  }]);
  const out = await prospectList.execute(
    { "status": "ACTIVE", "per_page": 2, "sort": "+company" } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v1/prospects");
  assertEquals(queryOf(calls[0].url), { "status": "ACTIVE", "per_page": "2", "sort": "+company" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.total, 41);
  assertEquals(out.count, 1);
});

Deno.test("prospect-list: campaign filter and an empty match", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "message": "There are no prospects matching the given criteria." },
  }]);
  const out = await prospectList.execute({ "campaigns_id": "7,8" } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v1/prospects");
  assertEquals(queryOf(calls[0].url), { "campaigns_id": "7,8" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.prospects, []);
  assertEquals(out.total, null);
});
