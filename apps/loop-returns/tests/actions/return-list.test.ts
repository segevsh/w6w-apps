import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/return-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "state": "open", "pageSize": 10 } as Record<string, unknown>;
const RESPONSE: unknown = {
  "returns": [{ "id": 1 }],
  "nextPageUrl": "https://api.loopreturns.com/api/v1/warehouse/return/list?cursor=abc&pageSize=10",
  "previousPageUrl": null,
};
const run = (ctx: Parameters<typeof action.execute>[1]) => action.execute(INPUT as never, ctx);

Deno.test("return-list: GET /warehouse/return/list", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await run(ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/warehouse/return/list");
  assert(calls[0].url.startsWith("https://api.loopreturns.com/api/v1/"));
  assertEquals(queryOf(calls[0].url), { "state": "open", "paginate": "true", "pageSize": "10" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(out, {
    "returns": [{ "id": 1 }],
    "nextCursor": "abc",
    "nextPageUrl":
      "https://api.loopreturns.com/api/v1/warehouse/return/list?cursor=abc&pageSize=10",
    "previousPageUrl": null,
  });
});

Deno.test("return-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await run(ctx);
  assertEquals(calls[0].headers["x-authorization"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("return-list: an HTTP error surfaces Loop's own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "401", http_code: "GEN-UNAUTHORIZED", message: "Unauthorized." } },
  }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("HTTP 401"));
  assert(err.message.includes("GEN-UNAUTHORIZED: Unauthorized."));
});

Deno.test("return-list: defaults the page size and tolerates a bare-array response", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  const out = await action.execute({} as never, ctx);
  assertEquals(queryOf(calls[0].url), { paginate: "true", pageSize: "25" });
  assertEquals(out, {
    returns: [{ id: 1 }],
    nextCursor: null,
    nextPageUrl: null,
    previousPageUrl: null,
  });
});
