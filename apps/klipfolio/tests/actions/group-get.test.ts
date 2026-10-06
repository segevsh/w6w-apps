import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/group-get.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT = {
  "group_id": "group1",
  "full": true,
  "client_id": "c1",
};
const RESPONSE = {
  "data": {
    "id": "a1",
    "name": "One",
  },
  "meta": {
    "success": true,
    "status": 200,
  },
};

Deno.test("group-get: sends GET /groups/group1 with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await action.execute!(INPUT, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://app.klipfolio.com/api/1.0/groups/group1");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { "full": "true", "client_id": "c1" });
  assertEquals(calls[0].body, null);
  assertEquals(JSON.parse(JSON.stringify(out)), { "id": "a1", "name": "One" });
});

Deno.test("group-get: sends no optional field when only required input is given", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "group_id": "group1" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.search, "");
});

Deno.test("group-get: sends no credential header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!(INPUT, ctx);
  assert(!("authorization" in calls[0].headers) && !("kf-api-key" in calls[0].headers));
});

Deno.test("group-get: surfaces Klipfolio's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      meta: { success: false, status: 400, error_code: "bad_request", error_desc: "bad input" },
    },
  }]);
  await assertRejects(
    async () => await action.execute!(INPUT, ctx),
    Error,
    "bad input (bad_request)",
  );
});

Deno.test("group-get: declares type, idempotency and output", () => {
  assertEquals(action.type, "read");
  assert(Array.isArray(action.output) && action.output.length > 0);
});
