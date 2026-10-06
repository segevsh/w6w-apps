import { assert, assertEquals } from "@std/assert";
import proposalDraftCreateFromTemplate from "../../actions/proposal-draft-create-from-template.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("proposal-draft-create-from-template: sends POST /v2/proposal-drafts/from-template", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "d9" } }]);
  const out = await proposalDraftCreateFromTemplate.execute(
    { "proposalTemplateId": "t1", "contactId": "c1" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assert(calls[0].url.startsWith(API_ROOT));
  assertEquals(pathOf(calls[0].url), "/v2/proposal-drafts/from-template");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "proposalTemplateId": "t1",
    "contactId": "c1",
  });
  // Credentials belong to `sign`, never to an action.
  assert(!("authorization" in calls[0].headers));
  assert(!("anchor-user-email" in calls[0].headers));
  assert(typeof out === "object" && out !== null);
  assertEquals(out.id, "d9");
});

Deno.test("proposal-draft-create-from-template: a non-2xx answer throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: 403, error: "FORBIDDEN_USER" } }]);
  let message = "";
  try {
    await proposalDraftCreateFromTemplate.execute(
      { "proposalTemplateId": "t1", "contactId": "c1" } as never,
      ctx,
    );
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("403"), message);
  assert(message.includes("FORBIDDEN_USER"), message);
});
