import { assertEquals } from "@std/assert";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/database-get.ts";

Deno.test("database-get: GETs the database resource named by the connection", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { name: "projects/p1/databases/(default)", type: "FIRESTORE_NATIVE" },
  }], { display: DISPLAY });

  const result = await action.execute({}, ctx) as { type?: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/projects/p1/databases/(default)");
  assertEquals(result.type, "FIRESTORE_NATIVE");
});

Deno.test("database-get: the action's projectId/databaseId override the connection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: DISPLAY });
  await action.execute({ projectId: "p2", databaseId: "named" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/projects/p2/databases/named");
});

Deno.test("database-get: the connection's databaseId defaults to (default)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], {
    display: { projectId: "p1" },
  });
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/projects/p1/databases/(default)");
});
