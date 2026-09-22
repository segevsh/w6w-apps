import { assertEquals } from "@std/assert";
import action from "../../actions/list-packages.ts";
import { API_ROOT, mockCtx, page, urlOf } from "../_helpers.ts";

const sample = page([{ id: "pkg-1", name: "6-session bundle" }], { count: 1 });

Deno.test("list-packages: reads /consultant/packages", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/packages`);
  assertEquals(result, sample);
});

Deno.test("list-packages: it is the template list, and the description says so", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "package");
  assertEquals(/not the instances/i.test(action.description!), true, action.description);
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), [
    "count",
    "hasMore",
    "items",
  ]);
});

Deno.test("list-packages: the four pagination controls are exposed", () => {
  assertEquals(
    action.params!.map((p) => p.key),
    ["after_id", "before_id", "limit", "skip"],
  );
});
