import { assertEquals } from "@std/assert";
import candidateList from "../../actions/candidate-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("candidate-list: GET /candidate/list with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  const out = await candidateList.execute(
    { "itemsPerPage": 10, "currentPage": 2, "includeNotes": true } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/candidate/list");
  assertEquals(queryOf(calls[0].url), {
    "items_per_page": "10",
    "current_page": "2",
    "include_notes": "1",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out.items, [{ id: 1 }]);
});

Deno.test("candidate-list: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await candidateList.execute(
      { "itemsPerPage": 10, "currentPage": 2, "includeNotes": true } as never,
      ctx,
    );
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
