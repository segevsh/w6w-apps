import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-list.ts";

const conn = { display: { baseUrl: "https://search.example.com" } };

/** /tasks pages by cursor, not offset — the offset walk would loop on page one. */
Deno.test("task-list: uses the cursor walk, never an offset", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { results: [{ uid: 1 }], next: null } }],
    conn,
  );
  assertEquals(await action.execute!({}, ctx), [{ uid: 1 }]);
  assertEquals(new URL(calls[0].url).pathname, "/tasks");
  assertEquals(new URL(calls[0].url).searchParams.get("offset"), null);
});

Deno.test("task-list: filters are comma-joined into one parameter each", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], conn);
  await action.execute!({ statuses: "failed, canceled", indexUids: "movies" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("statuses"), "failed,canceled");
  assertEquals(q.get("indexUids"), "movies");
});

Deno.test("task-list: returnAll follows the cursor", async () => {
  const full = Array.from({ length: 1000 }, (_, i) => ({ uid: i }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: { results: full, next: 500 } },
    { status: 200, body: { results: [{ uid: 500 }], next: null } },
  ], conn);
  assertEquals((await action.execute!({ returnAll: true }, ctx) as unknown[]).length, 1001);
  assertEquals(new URL(calls[1].url).searchParams.get("from"), "500");
});
