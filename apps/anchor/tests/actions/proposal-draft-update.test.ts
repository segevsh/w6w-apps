import { assert, assertEquals } from "@std/assert";
import proposalDraftUpdate from "../../actions/proposal-draft-update.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("proposal-draft-update: sends PATCH /v2/proposal-drafts/d1", async () => {
  const { ctx, calls } = mockCtx([{ body: { "draftId": "d1" } }]);
  const out = await proposalDraftUpdate.execute(
    { "id": "d1", "agreementName": "New" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assert(calls[0].url.startsWith(API_ROOT));
  assertEquals(pathOf(calls[0].url), "/v2/proposal-drafts/d1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "agreementName": "New",
  });
  // Credentials belong to `sign`, never to an action.
  assert(!("authorization" in calls[0].headers));
  assert(!("anchor-user-email" in calls[0].headers));
  assert(typeof out === "object" && out !== null);
  assertEquals(out.draftId, "d1");
});

Deno.test("proposal-draft-update: a non-2xx answer throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: 403, error: "FORBIDDEN_USER" } }]);
  let message = "";
  try {
    await proposalDraftUpdate.execute({ "id": "d1", "agreementName": "New" } as never, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("403"), message);
  assert(message.includes("FORBIDDEN_USER"), message);
});
