import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-list: GET /users/query with filters, returns the full envelope", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope([{ id: "u1" }, { id: "u2" }]),
  }]);
  const result = await userList.execute(
    { createdAtStart: "2026-01-01T00:00:00.000Z", sort: "-createdAt", perPage: 50 },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/users/query");
  assertEquals(queryOf(calls[0].url), {
    createdAtStart: "2026-01-01T00:00:00.000Z",
    sort: "-createdAt",
    perPage: "50",
  });
  assertEquals((result as { data: unknown[] }).data.length, 2);
  assertEquals((result as { meta: { totalItems: number } }).meta.totalItems, 2);
});

Deno.test("user-list: no filters given sends no query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([]) }]);
  await userList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
