import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/profile-get.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT = {
  "full": true,
};
const RESPONSE = {
  "data": {
    "id": "u1",
    "company": {
      "id": "co1",
      "name": "Acme",
    },
  },
  "meta": {
    "success": true,
    "status": 200,
  },
};

Deno.test("profile-get: sends GET /profile with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await action.execute!(INPUT, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://app.klipfolio.com/api/1.0/profile");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { "full": "true" });
  assertEquals(calls[0].body, null);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "id": "u1",
    "company": { "id": "co1", "name": "Acme" },
  });
});

Deno.test("profile-get: sends no optional field when only required input is given", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({} as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.search, "");
});

Deno.test("profile-get: sends no credential header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!(INPUT, ctx);
  assert(!("authorization" in calls[0].headers) && !("kf-api-key" in calls[0].headers));
});

Deno.test("profile-get: surfaces Klipfolio's error envelope as a thrown error", async () => {
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

Deno.test("profile-get: declares type, idempotency and output", () => {
  assertEquals(action.type, "read");
  assert(Array.isArray(action.output) && action.output.length > 0);
});
