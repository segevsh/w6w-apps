import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-bulk-get.ts";

Deno.test("subscriber-bulk-get: joins the ids into the path", async () => {
  const { ctx, calls } = mockCtx([{ body: { "1": { id: "1" }, "2": null } }]);
  const out = await action.execute({ subscriberIds: "1, 2" }, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/subscriber/bulk/1,2");
  assertEquals(out, { subscribers: { "1": { id: "1" }, "2": null } });
});

Deno.test("subscriber-bulk-get: rejects more than 200 ids and non-numeric ids before calling", async () => {
  const { ctx, calls } = mockCtx([]);
  const tooMany = Array.from({ length: 201 }, (_, i) => i + 1).join(",");
  await assertRejects(
    async () => await action.execute({ subscriberIds: tooMany }, ctx),
    Error,
    "at most 200",
  );
  await assertRejects(
    async () => await action.execute({ subscriberIds: "1,abc" }, ctx),
    Error,
    "not a numeric ID",
  );
  assertEquals(calls.length, 0);
});
