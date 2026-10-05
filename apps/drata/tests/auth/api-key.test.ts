import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const A = apiKey as any;

Deno.test("auth: declares a bearer credential with a secret key and a region select", () => {
  assertEquals(apiKey.type, "bearer");
  const fields = apiKey.fields!;
  assertEquals(fields.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(
    (fields.find((f) => f.key === "region")?.options as Array<{ value: string }>).map((o) =>
      o.value
    ),
    [
      "us",
      "eu",
      "apac",
    ],
  );
});

Deno.test("auth: sign sets the Bearer header", () => {
  const out = A.sign({ request: { headers: {} }, credential: { apiKey: "k1" } });
  assertEquals(out.headers.authorization, "Bearer k1");
});

Deno.test("auth: test succeeds on 2xx against the credential's region, without echoing the key", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const r = await A.test({ credential: { apiKey: "k1", region: "eu" } }, ctx);
  assertEquals(r, { ok: true });
  assertEquals(new URL(calls[0].url).host, "public-api.eu.drata.com");
  assertEquals(pathOf(calls[0].url), "/public/v2/workspaces");
  assertEquals(calls[0].headers.authorization, "Bearer k1");
});

Deno.test("auth: test classifies 401, 412 as not ok and a Drata-shaped 403 as ok", async () => {
  let m = mockCtx([{ status: 401, body: errorBody(401, "Unauthorized", 1) }]);
  let r = await A.test({ credential: { apiKey: "bad" } }, m.ctx);
  assertEquals(r.ok, false);
  assert(r.message.includes("rejected"), r.message);

  m = mockCtx([{ status: 412, body: errorBody(412, "Terms", 2) }]);
  r = await A.test({ credential: { apiKey: "k" } }, m.ctx);
  assertEquals(r.ok, false);
  assert(r.message.includes("terms"), r.message);

  m = mockCtx([{ status: 403, body: errorBody(403, "Forbidden", 3) }]);
  r = await A.test({ credential: { apiKey: "k" } }, m.ctx);
  assertEquals(r.ok, true);
  assert(r.message.includes("permission"), r.message);

  // A 403 that is not Drata's body (a proxy, a WAF) proves nothing about the key.
  m = mockCtx([{
    status: 403,
    body: "<html>blocked</html>",
    headers: { "content-type": "text/html" },
  }]);
  r = await A.test({ credential: { apiKey: "k" } }, m.ctx);
  assertEquals(r.ok, false);
});

Deno.test("auth: test refuses a missing key or an unknown region without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await A.test({ credential: {} }, ctx)).ok, false);
  const r = await A.test({ credential: { apiKey: "k", region: "mars" } }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth: afterConnect publishes only the region", () => {
  assertEquals(A.afterConnect({ credential: { apiKey: "secret", region: "APAC" } }), {
    region: "apac",
  });
  assertEquals(A.afterConnect({ credential: { apiKey: "secret" } }), { region: "us" });
});
