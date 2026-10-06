import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/group-create.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT = {
  "name": "Example",
  "description": "An example",
  "client_id": "c1",
};
const RESPONSE = {
  "meta": {
    "success": true,
    "status": 201,
    "location": "/groups/new123",
  },
  "data": {},
};

Deno.test("group-create: sends POST /groups with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await action.execute!(INPUT, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://app.klipfolio.com/api/1.0/groups");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "Example",
    "description": "An example",
    "client_id": "c1",
  });
  assertEquals(JSON.parse(JSON.stringify(out)), { "id": "new123", "location": "/groups/new123" });
});

Deno.test("group-create: sends no optional field when only required input is given", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "name": "Example" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.search, "");
  assertEquals(JSON.parse(calls[0].body!), { "name": "Example" });
});

Deno.test("group-create: sends no credential header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!(INPUT, ctx);
  assert(!("authorization" in calls[0].headers) && !("kf-api-key" in calls[0].headers));
});

Deno.test("group-create: surfaces Klipfolio's error envelope as a thrown error", async () => {
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

Deno.test("group-create: declares type, idempotency and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
