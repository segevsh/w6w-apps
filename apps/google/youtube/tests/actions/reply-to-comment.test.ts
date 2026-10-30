import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/reply-to-comment.ts";

test("reply-to-comment: POSTs /youtube/v3/comments with part=snippet fixed", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c2" } }]);
  await action.execute!({ parentId: "c1", textOriginal: "Thanks!" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/youtube/v3/comments");
  // Google's reference says "Set the parameter value to snippet" — there is no
  // choice to offer here, so the action does not invent one.
  assertEquals(url.searchParams.get("part"), "snippet");
  assertEquals(JSON.parse(calls[0].body!), {
    snippet: { parentId: "c1", textOriginal: "Thanks!" },
  });
});

test("reply-to-comment: exposes no part parameter, only parentId and text", () => {
  const keys = action.params!.map((p) => p.key).sort();
  assertEquals(keys, ["parentId", "textOriginal"]);
  for (const p of action.params!) assertEquals(p.required, true);
});

test("reply-to-comment: is honestly non-idempotent and says it creates replies only", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assert(/replies only|reply to an existing/i.test(action.description!));
});
