import { assertEquals, assertRejects } from "@std/assert";
import prospectSearch from "../../actions/prospect-search.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("prospect-search: sends search with campaigns_details", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ "id": 9, "email": "erlich@bachman.com" }],
  }]);
  const out = await prospectSearch.execute(
    { "search": "email=erlich@bachman.com" } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v1/prospects");
  assertEquals(queryOf(calls[0].url), {
    "search": "email=erlich@bachman.com",
    "campaigns_details": "true",
  });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.count, 1);
});

Deno.test("prospect-search: a bad search is surfaced from the v1 error body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: { "status": { "status": "ERROR", "code": "E_WRONG_PARAM", "msg": "Wrong param nope" } },
  }]);
  await assertRejects(
    async () => await prospectSearch.execute({ "search": "nope=1" } as never, ctx),
    Error,
    "E_WRONG_PARAM",
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/rest/v1/prospects");
  assertEquals(jsonBody(calls[0]), null);
});
