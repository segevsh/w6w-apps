import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-search.ts";

Deno.test("subscriber-search: returns the first id and the list", async () => {
  const { ctx, calls } = mockCtx([{ body: [3] }]);
  const out = await action.execute({ email: "a@example.com" }, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/subscriber/search");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@example.com" });
  assertEquals(out, { subscriberId: 3, subscriberIds: [3] });
});

Deno.test("subscriber-search: an empty array is null, not an error", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  assertEquals(await action.execute({ email: "a@example.com" }, ctx), {
    subscriberId: null,
    subscriberIds: [],
  });
});

Deno.test("subscriber-search: 404 surfaces the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: ["There is no such entity."] }]);
  await assertRejects(
    async () => await action.execute({ email: "a@example.com" }, ctx),
    Error,
    "no such entity",
  );
});
