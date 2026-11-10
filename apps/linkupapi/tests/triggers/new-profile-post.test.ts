import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-profile-post.ts";

const params = { accountId: "account-1", profileUrl: "https://example.test/in/avery" };
const post = (id: string) => ({ activity_id: id, text: `Post ${id}` });

test("new-profile-post seeds, emits, retries, and requests the newest profile posts", async () => {
  const seed = mockCtx([{ body: { success: true, data: { posts: [post("old")] } } }]);
  const seeded = await trigger.poll!({ state: {}, params } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://api.linkupapi.com/v2/profiles");
  assertEquals(JSON.parse(seed.calls[0].body!), {
    account_id: "account-1",
    action: "get_posts",
    params: {
      profile_url: "https://example.test/in/avery",
      count: 10,
      include_reshares: false,
    },
  });
  const responses = [{ body: { success: true, data: { posts: [post("new"), post("old")] } } }];
  const first = await trigger.poll!(
    { state: seeded.nextState, params } as never,
    mockCtx(responses).ctx,
  );
  const retry = await trigger.poll!(
    { state: seeded.nextState, params } as never,
    mockCtx(responses).ctx,
  );
  assertEquals(first.events, [post("new")]);
  assertEquals(retry, first);
});
