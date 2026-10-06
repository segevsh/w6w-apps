import { assertEquals, assertRejects } from "@std/assert";
import computerGet from "../../actions/computer-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("computer-get: GET /computers/{set}", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }, { id: 3 }] }]);
  const out = await computerGet.execute({ computerIds: "1, 3" }, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/computers/1,3");
  assertEquals(out.count, 2);
});

Deno.test("computer-get: a malformed set is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await computerGet.execute({ computerIds: "1/../x" }, ctx),
    Error,
    "positive integers",
  );
  assertEquals(calls.length, 0);
});
