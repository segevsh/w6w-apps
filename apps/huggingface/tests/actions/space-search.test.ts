import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/space-search.ts";

Deno.test("space-search: hits the spaces endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/spaces");
  assertEquals(action.resource, "space");
});

/** A Space is a running application; nobody downloads one. */
Deno.test("space-search: sorts by likes and offers no downloads sort", () => {
  const sort = action.params!.find((p) => p.key === "sort")!;
  assertEquals(sort.default, "likes");
  const options = sort.options as Array<{ value: string }>;
  assertEquals(options.some((option) => option.value === "downloads"), false);
  assert(/nobody\s+downloads/.test(action.description!), action.description);
});

Deno.test("space-search: filters by owner", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({ author: "stabilityai" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("author"), "stabilityai");
});

Deno.test("space-search: returns the ids of what it found", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ id: "a/demo" }, { id: "b/demo" }] }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.ids, ["a/demo", "b/demo"]);
  assertEquals(result.gatedCount, 0);
});

Deno.test("space-search: a failure names the endpoint that failed", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/\/api\/spaces/.test(message), message);
});
