import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-list.ts";

Deno.test("conversation-list: statuses go out as repeated q[statuses] keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _results: [{ id: "cnv_1" }] } }]);
  assertEquals(await action.execute!({ statuses: ["assigned", "unassigned"] }, ctx), [{
    id: "cnv_1",
  }]);
  assertEquals(
    new URL(calls[0].url).searchParams.getAll("q[statuses]"),
    ["assigned", "unassigned"],
  );
});

Deno.test("conversation-list: no status filter asks for everything", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _results: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.getAll("q[statuses]"), []);
});

/** `sort_by` only supports `date`, which is already the default. */
Deno.test("conversation-list: sends sort_order but never sort_by", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _results: [] } }]);
  await action.execute!({ sortOrder: "asc" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("sort_order"), "asc");
  assertEquals(q.get("sort_by"), null);
});

/** There is no single `open` status — that is Front's model, not an omission. */
Deno.test("conversation-list: the status options are Front's four stored states", () => {
  const p = (action.params as Array<{ key: string; options?: Array<{ value: string }> }>)
    .find((p) => p.key === "statuses")!;
  assertEquals(p.options!.map((o) => o.value), ["assigned", "unassigned", "archived", "trashed"]);
  assert(!p.options!.some((o) => o.value === "open"));
});
