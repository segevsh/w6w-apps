import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/system-group-list.ts";

const display = { display: { region: "us" } };

Deno.test("system-group-list: reads the V2 systemgroups collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "sg1" }] }], display);
  assertEquals(await action.execute!({}, ctx), [{ id: "sg1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/systemgroups");
});

Deno.test("system-group-list: returnAll walks the offset", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ id: `sg${i}` }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: full },
    { status: 200, body: [{ id: "last" }] },
  ], display);
  const result = await action.execute!({ returnAll: true }, ctx) as unknown[];
  assertEquals(result.length, 101);
  assertEquals(new URL(calls[1].url).searchParams.get("skip"), "100");
});
