import { assertEquals } from "@std/assert";
import coursesList from "../../actions/courses-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("courses-list: fetches GET /courses with page/limit", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: listEnvelope([{ id: 1, name: "My Course" }]) },
  ]);
  const out = await coursesList.execute({ page: 2, limit: 10 }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/public/v1/courses");
  assertEquals(queryOf(calls[0].url), { page: "2", limit: "10" });
  assertEquals(out.items, [{ id: 1, name: "My Course" }]);
});

Deno.test("courses-list: defaults are page 1 / limit 25", () => {
  const page = coursesList.params!.find((p) => p.key === "page")!;
  const limit = coursesList.params!.find((p) => p.key === "limit")!;
  assertEquals(page.default, 1);
  assertEquals(limit.default, 25);
  assertEquals(limit.validation?.max, 250);
});
