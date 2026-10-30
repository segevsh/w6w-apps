import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import mailingListGet from "../../actions/mailing-list-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("mailing-list-get: calls GET /api/v2/mailing-lists/7 and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": 7, "description": "List", "total_recipients": 4 },
  }]);
  const out = await mailingListGet.execute({ "mailingListId": "7" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/mailing-lists/7");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assert((out.mailingList as Record<string, number>).total_recipients === 4, JSON.stringify(out));
});

test("mailing-list-get: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { "message": "Mailing List Does Not Exist" } }]);
  const err = await assertRejects(
    () => Promise.resolve(mailingListGet.execute({ "mailingListId": "7" } as never, ctx)),
    Error,
  );
  assert(err.message.includes("HTTP 404") && err.message.includes("Does Not Exist"), err.message);
});
