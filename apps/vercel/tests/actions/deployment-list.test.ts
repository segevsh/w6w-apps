import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deployment-list.ts";

const display = { teamId: "team_abc" };
const page = (items: unknown[], next: number | null) => ({
  deployments: items,
  pagination: { count: items.length, next, prev: null },
});

Deno.test("deployment-list: hits /v7/deployments with the connection's team", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([{ uid: "dpl_1" }], null) }], {
    display,
  });
  const result = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v7/deployments");
  assertEquals(url.searchParams.get("teamId"), "team_abc");
  assertEquals(result, [{ uid: "dpl_1" }]);
});

Deno.test("deployment-list: states go as one comma-separated value, not repeated params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([], null) }], { display });
  await action.execute!({ state: ["BUILDING", "ERROR"], target: "production" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("state"), "BUILDING,ERROR");
  assertEquals(q.getAll("state").length, 1);
  assertEquals(q.get("target"), "production");
});

Deno.test("deployment-list: branch, sha and rollbackCandidate filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([], null) }], { display });
  await action.execute!({
    projectId: "my-app",
    branch: "main",
    sha: "a1b2c3",
    rollbackCandidate: true,
    since: 1700000000000,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("projectId"), "my-app");
  assertEquals(q.get("branch"), "main");
  assertEquals(q.get("sha"), "a1b2c3");
  assertEquals(q.get("rollbackCandidate"), "true");
  assertEquals(q.get("since"), "1700000000000");
});

Deno.test("deployment-list: returnAll follows the pagination cursor", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: page([{ uid: "1" }], 1700000000000) },
    { status: 200, body: page([{ uid: "2" }], null) },
  ], { display });
  assertEquals(await action.execute!({ returnAll: true }, ctx), [{ uid: "1" }, { uid: "2" }]);
  assertEquals(new URL(calls[1].url).searchParams.get("until"), "1700000000000");
});
