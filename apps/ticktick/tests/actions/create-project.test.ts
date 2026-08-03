import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-project.ts";

Deno.test("create-project: a name-only call sends a one-field body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "P1" } }]);
  await action.execute!({ name: "Work" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/project");
  assertEquals(JSON.parse(calls[0].body!), { name: "Work" });
});

Deno.test("create-project: sends every field the caller sets", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    { name: "Work", color: "#F18181", sortOrder: 3, viewMode: "kanban", kind: "TASK" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Work",
    color: "#F18181",
    sortOrder: 3,
    viewMode: "kanban",
    kind: "TASK",
  });
});

Deno.test("create-project: offers only the documented view modes and kinds", () => {
  const viewMode = action.params!.find((p) => p.key === "viewMode")!;
  assertEquals((viewMode.options as Array<{ value: unknown }>).map((o) => o.value), [
    "list",
    "kanban",
    "timeline",
  ]);
  const kind = action.params!.find((p) => p.key === "kind")!;
  assertEquals((kind.options as Array<{ value: unknown }>).map((o) => o.value), ["TASK", "NOTE"]);
});

Deno.test("create-project: honestly non-idempotent — TickTick mints a fresh id per call", () => {
  assertEquals(action.idempotent, false);
  assert(action.params!.find((p) => p.key === "name")?.required);
});
