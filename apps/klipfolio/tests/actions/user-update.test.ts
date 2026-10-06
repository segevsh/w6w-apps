import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/user-update.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT = {
  "user_id": "user1",
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "external_id": "ext-1",
  "client_id": "c1",
};
const RESPONSE = {
  "meta": {
    "success": true,
    "status": 200,
  },
  "data": {},
};

Deno.test("user-update: sends PUT /users/user1 with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await action.execute!(INPUT, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://app.klipfolio.com/api/1.0/users/user1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(Object.fromEntries(url.searchParams), { "client_id": "c1" });
  assertEquals(JSON.parse(calls[0].body!), {
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "external_id": "ext-1",
  });
  assertEquals(JSON.parse(JSON.stringify(out)), { "success": true });
});

Deno.test("user-update: sends no optional field when only required input is given", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "user_id": "user1" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.search, "");
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("user-update: sends no credential header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!(INPUT, ctx);
  assert(!("authorization" in calls[0].headers) && !("kf-api-key" in calls[0].headers));
});

Deno.test("user-update: surfaces Klipfolio's error envelope as a thrown error", async () => {
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

Deno.test("user-update: declares type, idempotency and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
