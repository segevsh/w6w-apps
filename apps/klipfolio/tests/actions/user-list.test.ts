import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/user-list.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT = {
  "limit": 10,
  "offset": 20,
  "email": "jane@example.com",
  "external_id": "ext-1",
  "include_roles": true,
  "include_groups": true,
  "client_id": "c1",
};
const RESPONSE = {
  "data": {
    "users": [
      {
        "id": "a1",
        "name": "One",
      },
    ],
  },
  "meta": {
    "success": true,
    "status": 200,
    "count": 1,
    "total": 1,
  },
};

Deno.test("user-list: sends GET /users with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await action.execute!(INPUT, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://app.klipfolio.com/api/1.0/users");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "limit": "10",
    "offset": "20",
    "email": "jane@example.com",
    "external_id": "ext-1",
    "include_roles": "true",
    "include_groups": "true",
    "client_id": "c1",
  });
  assertEquals(calls[0].body, null);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "items": [{ "id": "a1", "name": "One" }],
    "count": 1,
    "total": 1,
  });
});

Deno.test("user-list: sends no optional field when only required input is given", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({} as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.search, "");
});

Deno.test("user-list: sends no credential header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!(INPUT, ctx);
  assert(!("authorization" in calls[0].headers) && !("kf-api-key" in calls[0].headers));
});

Deno.test("user-list: surfaces Klipfolio's error envelope as a thrown error", async () => {
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

Deno.test("user-list: declares type, idempotency and output", () => {
  assertEquals(action.type, "read");
  assert(Array.isArray(action.output) && action.output.length > 0);
});
