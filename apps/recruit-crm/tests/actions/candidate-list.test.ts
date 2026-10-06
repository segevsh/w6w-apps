import { assertEquals } from "@std/assert";
import action from "../../actions/candidate-list.ts";
import { mockCtx, paginator, pathOf, queryOf } from "../_helpers.ts";

Deno.test("candidate-list: GETs /candidates with page and limit and folds the paginator", async () => {
  const { ctx, calls } = mockCtx([{
    body: paginator([{ slug: "1" }, { slug: "2" }], "https://x/next"),
  }]);
  const out = await action.execute({ limit: 50, page: 2 }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/candidates");
  assertEquals(queryOf(calls[0].url), { limit: "50", page: "2" });
  assertEquals(out.count, 2);
  assertEquals(out.hasMore, true);
  assertEquals(out.currentPage, 1);
});

Deno.test("candidate-list: last page reports hasMore false and unset params are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: paginator([]) }]);
  const out = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.recruitcrm.io/v1/candidates");
  assertEquals(out.hasMore, false);
  assertEquals(out.items, []);
});

Deno.test("candidate-list: a vendor error surfaces with its own text", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Unauthorized" } }]);
  let msg = "";
  try {
    await action.execute({}, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg, "Recruit CRM 401 for GET /v1/candidates: Unauthorized");
});
