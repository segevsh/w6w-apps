import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/space-list.ts";

const display = { site: "acme" };

Deno.test("space-list: filters by the human-facing space keys", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { results: [{ id: "101", key: "ENG" }], _links: {} },
  }], { display });
  const result = await action.execute!({ keys: "ENG, OPS", type: "global" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/wiki/api/v2/spaces");
  assertEquals(q.getAll("keys"), ["ENG", "OPS"]);
  assertEquals(q.get("type"), "global");
  assertEquals(result, [{ id: "101", key: "ENG" }]);
});

Deno.test("space-list: returnAll walks every page", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { results: [{ id: "1" }], _links: { next: "/wiki/api/v2/spaces?cursor=c2" } },
    },
    { status: 200, body: { results: [{ id: "2" }], _links: {} } },
  ], { display });
  assertEquals(await action.execute!({ returnAll: true }, ctx), [{ id: "1" }, { id: "2" }]);
  assertEquals(calls.length, 2);
});
