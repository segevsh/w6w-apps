import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-list.ts";

const conn = { display: { baseUrl: "https://search.example.com" } };

/** Offset-paged, unlike /tasks. */
Deno.test("index-list: reads the offset-paged index collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [{ uid: "movies" }] } }], conn);
  assertEquals(await action.execute!({}, ctx), [{ uid: "movies" }]);
  assertEquals(new URL(calls[0].url).pathname, "/indexes");
  assertEquals(new URL(calls[0].url).searchParams.get("offset"), "0");
});

Deno.test("index-list: returnAll walks the offset", async () => {
  const full = Array.from({ length: 1000 }, (_, i) => ({ uid: `i${i}` }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: { results: full } },
    { status: 200, body: { results: [{ uid: "last" }] } },
  ], conn);
  assertEquals((await action.execute!({ returnAll: true }, ctx) as unknown[]).length, 1001);
  assertEquals(new URL(calls[1].url).searchParams.get("offset"), "1000");
});
