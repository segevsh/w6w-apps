import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/member-list.ts";

const conn = { display: {} };

Deno.test("member-list: reads the items envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [{ key: "x" }] } }], conn);
  assertEquals(await action.execute!({}, ctx), [{ key: "x" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/members");
});

Deno.test("member-list: returnAll walks the offset", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ key: `k${i}` }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: { items: full } },
    { status: 200, body: { items: [{ key: "last" }] } },
  ], conn);
  assertEquals((await action.execute!({ returnAll: true }, ctx) as unknown[]).length, 101);
  assertEquals(new URL(calls[1].url).searchParams.get("offset"), "100");
});
