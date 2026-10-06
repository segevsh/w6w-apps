import { assert, assertEquals } from "@std/assert";
import payoutList from "../../actions/payout-list.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("payout-list: sends GET /payouts", async () => {
  const { ctx, calls } = mockCtx([{ body: { "entries": [] } }]);
  const out = await payoutList.execute({ "sortField": "depositDate" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assert(calls[0].url.startsWith(API_ROOT));
  assertEquals(pathOf(calls[0].url), "/payouts");
  assertEquals(queryOf(calls[0].url), { "sortField": "depositDate" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  // Credentials belong to `sign`, never to an action.
  assert(!("authorization" in calls[0].headers));
  assert(!("anchor-user-email" in calls[0].headers));
  assert(typeof out === "object" && out !== null);
  assertEquals(out.entries, []);
});

Deno.test("payout-list: a non-2xx answer throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: 403, error: "FORBIDDEN_USER" } }]);
  let message = "";
  try {
    await payoutList.execute({ "sortField": "depositDate" } as never, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("403"), message);
  assert(message.includes("FORBIDDEN_USER"), message);
});
