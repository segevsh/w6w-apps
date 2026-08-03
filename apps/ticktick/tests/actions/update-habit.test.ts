import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-habit.ts";

Deno.test("update-habit: POSTs /habit/{id} with only the fields set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ habitId: "habit-1", goal: 2 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/habit/habit-1");
  assertEquals(JSON.parse(calls[0].body!), { goal: 2 });
});

Deno.test("update-habit: the habit id stays a path segment, never a body field", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ habitId: "habit-1", name: "Read more" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { name: "Read more" });
  assert(!("habitId" in body));
  assert(!("id" in body));
});

Deno.test("update-habit: omitting the name sends no name — it does not clear it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ habitId: "habit-1", color: "#000000" }, ctx);
  assert(!("name" in JSON.parse(calls[0].body!)));
});

Deno.test("update-habit: an explicit empty name is still sent — the caller meant it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ habitId: "habit-1", name: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "" });
});

Deno.test("update-habit: name is optional and its hint warns about the null-on-empty rule", () => {
  const name = action.params!.find((p) => p.key === "name")!;
  assertEquals(name.required, undefined);
  assert(name.hint!.includes("null"));
  assertEquals(action.idempotent, true);
});
