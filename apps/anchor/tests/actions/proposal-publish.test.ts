import { assert, assertEquals } from "@std/assert";
import proposalPublish from "../../actions/proposal-publish.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("proposal-publish: sends POST /proposals", async () => {
  const { ctx, calls } = mockCtx([{ body: { "proposalId": "p1" } }]);
  const out = await proposalPublish.execute(
    { "draftId": "d1", "notifyPolicy": "silent" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assert(calls[0].url.startsWith(API_ROOT));
  assertEquals(pathOf(calls[0].url), "/proposals");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "draftId": "d1",
    "notifyPolicy": "silent",
  });
  // Credentials belong to `sign`, never to an action.
  assert(!("authorization" in calls[0].headers));
  assert(!("anchor-user-email" in calls[0].headers));
  assert(typeof out === "object" && out !== null);
  assertEquals(out.proposalId, "p1");
});

Deno.test("proposal-publish: a non-2xx answer throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: 403, error: "FORBIDDEN_USER" } }]);
  let message = "";
  try {
    await proposalPublish.execute({ "draftId": "d1", "notifyPolicy": "silent" } as never, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("403"), message);
  assert(message.includes("FORBIDDEN_USER"), message);
});
