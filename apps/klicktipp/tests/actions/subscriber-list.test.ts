import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-list.ts";

Deno.test("subscriber-list: sends the filters and a limit, returns the page", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscriberIds: ["1", "2"], nextCursor: "abc" } }]);
  const out = await action.execute(
    { status: ["subscribed", "pending"], bounceStatus: "nobounce", limit: 2, cursor: "c0" },
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.klicktipp.com/subscriber?status=subscribed%2Cpending&bounceStatus=nobounce&limit=2&cursor=c0",
  );
  assertEquals(out, { subscriberIds: ["1", "2"], nextCursor: "abc" });
});

Deno.test("subscriber-list: defaults the limit to 100 so the response is paginated", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscriberIds: [], nextCursor: null } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/subscriber?limit=100");
});

Deno.test("subscriber-list: accepts the legacy flat array", async () => {
  const { ctx } = mockCtx([{ body: ["7", "8"] }]);
  assertEquals(await action.execute({}, ctx), { subscriberIds: ["7", "8"], nextCursor: null });
});

Deno.test("subscriber-list: a 403 body becomes the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: ["API access denied."] }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "API access denied.");
});
