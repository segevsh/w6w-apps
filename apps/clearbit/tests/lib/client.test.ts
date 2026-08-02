import { assertEquals, assertRejects } from "@std/assert";
import { ClearbitClient, compact } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: "x", b: undefined, c: null, d: "", e: 0, f: false }), {
    a: "x",
    e: 0,
    f: false,
  });
});

Deno.test("ClearbitClient: builds the URL from host + path + query", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new ClearbitClient(ctx);
  await client.request("company.clearbit.com", "/v1/domains/find", { query: { name: "Clearbit" } });
  assertEquals(calls[0].url, "https://company.clearbit.com/v1/domains/find?name=Clearbit");
});

Deno.test("ClearbitClient: a 404 raises a 'no match' error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: { type: "not_found" } } }]);
  const client = new ClearbitClient(ctx);
  await assertRejects(
    () =>
      client.request("person-stream.clearbit.com", "/v2/people/find", {
        query: { email: "a@b.com" },
      }),
    Error,
    "found no match (404)",
  );
});

Deno.test("ClearbitClient: a 202 raises a 'queued' error", async () => {
  const { ctx } = mockCtx([{ status: 202, body: {} }]);
  const client = new ClearbitClient(ctx);
  await assertRejects(
    () =>
      client.request("person-stream.clearbit.com", "/v2/people/find", {
        query: { email: "a@b.com" },
      }),
    Error,
    "queued",
  );
});

Deno.test("ClearbitClient: a 401 raises with Clearbit's error message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      error: { type: "auth_required", message: "Authentication is required for this action." },
    },
  }]);
  const client = new ClearbitClient(ctx);
  await assertRejects(
    () => client.request("company.clearbit.com", "/v1/domains/find", { query: { name: "x" } }),
    Error,
    "Authentication is required",
  );
});

Deno.test("ClearbitClient: POST sends a JSON body and content-type header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { risk: { level: "low", score: 0 } } }]);
  const client = new ClearbitClient(ctx);
  await client.request("risk.clearbit.com", "/v1/calculate", {
    method: "POST",
    body: { email: "a@b.com", ip: "1.2.3.4" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com", ip: "1.2.3.4" });
});

Deno.test("ClearbitClient: an empty body response resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const client = new ClearbitClient(ctx);
  const result = await client.request("risk.clearbit.com", "/v1/flag", { method: "POST" });
  assertEquals(result, undefined);
});
