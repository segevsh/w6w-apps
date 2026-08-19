import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/flex-cluster-list.ts";

const page = {
  status: 200,
  body: { results: [{ name: "flex-1", stateName: "IDLE" }], totalCount: 1 },
};

/** The family exists only from this version — an older date is a bare 404. */
Deno.test("flex-cluster-list: pins the version the family exists at", async () => {
  const { ctx, calls } = mockCtx([page]);
  await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/flexClusters",
  );
  assertEquals(calls[0].headers["accept"], "application/vnd.atlas.2024-11-13+json");
});

Deno.test("flex-cluster-list: returns the names and the total", async () => {
  const { ctx } = mockCtx([page]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.names, ["flex-1"]);
  assertEquals(result.count, 1);
  assertEquals(result.totalCount, 1);
});

/** An inventory built on `cluster-list` alone is quietly incomplete. */
Deno.test("flex-cluster-list: exists because cluster-list does not return these", () => {
  assert(/`cluster-list` does NOT return/.test(action.description!), action.description);
  assert(/2024-11-13/.test(action.description!), action.description);
});

Deno.test("flex-cluster-list: a 404 explains the version trap", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { detail: "not found" } }]);
  let message = "";
  try {
    await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/asked for 2024-11-13/.test(message), message);
  assert(/introduced after that date/.test(message), message);
});

Deno.test("flex-cluster-list: a project with none is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { results: [] } }]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.count, 0);
});
