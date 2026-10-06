import { assert, assertEquals } from "@std/assert";
import proposalTemplateList from "../../actions/proposal-template-list.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("proposal-template-list: sends GET /proposal-templates", async () => {
  const { ctx, calls } = mockCtx([{ body: { "entries": [] } }]);
  const out = await proposalTemplateList.execute(
    { "search": "web", "searchMode": "fuzzy" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assert(calls[0].url.startsWith(API_ROOT));
  assertEquals(pathOf(calls[0].url), "/proposal-templates");
  assertEquals(queryOf(calls[0].url), { "search": "web", "searchMode": "fuzzy" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  // Credentials belong to `sign`, never to an action.
  assert(!("authorization" in calls[0].headers));
  assert(!("anchor-user-email" in calls[0].headers));
  assert(typeof out === "object" && out !== null);
  assertEquals(out.entries, []);
});

Deno.test("proposal-template-list: a non-2xx answer throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: 403, error: "FORBIDDEN_USER" } }]);
  let message = "";
  try {
    await proposalTemplateList.execute({ "search": "web", "searchMode": "fuzzy" } as never, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("403"), message);
  assert(message.includes("FORBIDDEN_USER"), message);
});
