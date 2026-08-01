import { assertEquals } from "@std/assert";
import { mockSupabaseCtx } from "../_helpers.ts";
import action from "../../actions/rows-insert.ts";

Deno.test("rows-insert: POSTs the row(s) and asks for the representation back", async () => {
  const { ctx, calls } = mockSupabaseCtx([{ status: 201, body: [{ id: 1, name: "a" }] }]);
  const out = await action.execute({ table: "todos", rows: { name: "a" } }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["prefer"], "return=representation");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "a" });
  assertEquals(out, { rows: [{ id: 1, name: "a" }] });
});

Deno.test("rows-insert: accepts a JSON-string body (raw form input) as well as an object", async () => {
  const { ctx, calls } = mockSupabaseCtx([{ body: [{ id: 1 }] }]);
  await action.execute({ table: "todos", rows: '{"name":"a"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "a" });
});

Deno.test("rows-insert: upsert adds resolution=merge-duplicates and on_conflict=", async () => {
  const { ctx, calls } = mockSupabaseCtx([{ body: [{ id: 1 }] }]);
  await action.execute({
    table: "todos",
    rows: { id: 1, name: "a" },
    upsert: true,
    onConflict: "id",
  }, ctx);
  assertEquals(calls[0].headers["prefer"], "return=representation,resolution=merge-duplicates");
  assertEquals(new URL(calls[0].url).searchParams.get("on_conflict"), "id");
});

Deno.test("rows-insert: bulk insert takes an array body", async () => {
  const { ctx, calls } = mockSupabaseCtx([{ body: [{ id: 1 }, { id: 2 }] }]);
  const out = await action.execute({
    table: "todos",
    rows: [{ name: "a" }, { name: "b" }],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), [{ name: "a" }, { name: "b" }]);
  assertEquals(out, { rows: [{ id: 1 }, { id: 2 }] });
});
