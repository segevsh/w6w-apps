import { assert, assertEquals } from "@std/assert";
import proposalWithdrawForEditing from "../../actions/proposal-withdraw-for-editing.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("proposal-withdraw-for-editing: sends POST /v2/proposals/p1/withdraw-for-editing", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await proposalWithdrawForEditing.execute({ "id": "p1" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assert(calls[0].url.startsWith(API_ROOT));
  assertEquals(pathOf(calls[0].url), "/v2/proposals/p1/withdraw-for-editing");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  // Credentials belong to `sign`, never to an action.
  assert(!("authorization" in calls[0].headers));
  assert(!("anchor-user-email" in calls[0].headers));
  assert(typeof out === "object" && out !== null);
  assertEquals(out.ok, true);
});

Deno.test("proposal-withdraw-for-editing: a non-2xx answer throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: 403, error: "FORBIDDEN_USER" } }]);
  let message = "";
  try {
    await proposalWithdrawForEditing.execute({ "id": "p1" } as never, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("403"), message);
  assert(message.includes("FORBIDDEN_USER"), message);
});
