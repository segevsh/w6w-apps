import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import action from "../../actions/receiver-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("receiver-add: POSTs the receiver object itself, not wrapped in postdata", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 11, email: "bruce@gotham.com" } }]);
  await action.execute({
    groupId: "5",
    email: "bruce@gotham.com",
    source: "Batcave",
    registered: "2005-06-10T00:00:00Z",
    attributes: { is_batman: "1" },
    globalAttributes: '{"firstname":"Bruce"}',
    tags: "hero, rich",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/groups/5/receivers");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "bruce@gotham.com",
    source: "Batcave",
    registered: 1118361600,
    attributes: { is_batman: "1" },
    global_attributes: { firstname: "Bruce" },
    tags: ["hero", "rich"],
  });
});

Deno.test("receiver-add: requires an email and valid JSON before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ groupId: "5" }, ctx),
    Error,
    "`email` is required",
  );
  await assertRejects(
    async () => await action.execute({ groupId: "5", email: "a@b.co", attributes: "{nope" }, ctx),
    Error,
    "`attributes` is not valid JSON",
  );
  await assertRejects(
    async () =>
      await action.execute({ groupId: "5", email: "a@b.co", registered: "yesterday" }, ctx),
    Error,
    "`registered` must be",
  );
  assertEquals(calls.length, 0);
});

Deno.test("receiver-add: surfaces a vendor error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { code: 400, message: "duplicate: receiver exists" } },
  }]);
  const err = await assertRejects(async () =>
    await action.execute({ groupId: "5", email: "a@b.co" }, ctx)
  );
  assertMatch((err as Error).message, /CleverReach 400: duplicate: receiver exists/);
});
