import { assert, assertEquals } from "@std/assert";
import adhocAgreementGetOrCreate from "../../actions/adhoc-agreement-get-or-create.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("adhoc-agreement-get-or-create: sends POST /relationship/create-adhoc", async () => {
  const { ctx, calls } = mockCtx([{ body: { "relationshipId": "r1" } }]);
  const out = await adhocAgreementGetOrCreate.execute(
    { "clientContactId": "c1" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assert(calls[0].url.startsWith(API_ROOT));
  assertEquals(pathOf(calls[0].url), "/relationship/create-adhoc");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "clientContactId": "c1",
  });
  // Credentials belong to `sign`, never to an action.
  assert(!("authorization" in calls[0].headers));
  assert(!("anchor-user-email" in calls[0].headers));
  assert(typeof out === "object" && out !== null);
  assertEquals(out.relationshipId, "r1");
});

Deno.test("adhoc-agreement-get-or-create: a non-2xx answer throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: 403, error: "FORBIDDEN_USER" } }]);
  let message = "";
  try {
    await adhocAgreementGetOrCreate.execute({ "clientContactId": "c1" } as never, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("403"), message);
  assert(message.includes("FORBIDDEN_USER"), message);
});
