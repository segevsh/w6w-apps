import { assert, assertEquals } from "@std/assert";
import statsAccountByDate from "../../actions/stats-account-by-date.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("stats-account-by-date: calls GET /modern/stats/account/by_date with the version header", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ "id": 1, "cursor": "cur1" }, { "id": 2, "cursor": "cur2" }],
  }]);
  const out = await statsAccountByDate.execute(
    { "startDate": "2026-10-01", "endDate": "2026-10-05" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).origin, "https://api.wistia.com");
  assertEquals(pathOf(calls[0].url), "/modern/stats/account/by_date");
  assertEquals(queryOf(calls[0].url), { "start_date": "2026-10-01", "end_date": "2026-10-05" });
  assertEquals(calls[0].headers["x-wistia-api-version"], "2026-09");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out.count, 2);
  assertEquals(out.nextCursor, "cur2");
  assertEquals((out.items as unknown[]).length, 2);
});

Deno.test("stats-account-by-date: surfaces a Wistia error with its code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized_scope", error: "Token lacks scope." },
  }]);
  let message = "";
  try {
    await statsAccountByDate.execute(
      { "startDate": "2026-10-01", "endDate": "2026-10-05" } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Wistia 401 unauthorized_scope"), message);
  assert(message.includes("Token lacks scope."), message);
});
