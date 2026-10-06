import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/client-create.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT = {
  "name": "Example",
  "description": "An example",
  "status": "trial",
  "seats": 20,
  "custom_theme": true,
  "external_id": "ext-9",
};
const RESPONSE = {
  "meta": {
    "success": true,
    "status": 201,
    "location": "/clients/new123",
  },
  "data": {},
};

Deno.test("client-create: sends POST /clients with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await action.execute!(INPUT, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://app.klipfolio.com/api/1.0/clients");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "Example",
    "description": "An example",
    "status": "trial",
    "seats": 20,
    "custom_theme": true,
    "external_id": "ext-9",
  });
  assertEquals(JSON.parse(JSON.stringify(out)), { "id": "new123", "location": "/clients/new123" });
});

Deno.test("client-create: sends no optional field when only required input is given", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "name": "Example" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.search, "");
  assertEquals(JSON.parse(calls[0].body!), { "name": "Example" });
});

Deno.test("client-create: sends no credential header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!(INPUT, ctx);
  assert(!("authorization" in calls[0].headers) && !("kf-api-key" in calls[0].headers));
});

Deno.test("client-create: surfaces Klipfolio's error envelope as a thrown error", async () => {
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

Deno.test("client-create: declares type, idempotency and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
