import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contract-list.ts";

const display = {};

Deno.test("contract-list: uses the CURSOR pager", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "c1" }], page: { cursor: "n1" } } },
    { status: 200, body: { data: [{ id: "c2" }], page: {} } },
  ], { display });
  const result = await action.execute!({ returnAll: true }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/contracts");
  assertEquals(new URL(calls[1].url).searchParams.get("after_cursor"), "n1");
  assertEquals(result, [{ id: "c1" }, { id: "c2" }]);
});

Deno.test("contract-list: filters repeat their key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], page: {} } }], { display });
  await action.execute!({ statuses: ["in_progress"], countries: "GB,US", teamId: "t1" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("statuses"), ["in_progress"]);
  assertEquals(q.getAll("countries"), ["GB", "US"]);
  assertEquals(q.get("team_id"), "t1");
});
