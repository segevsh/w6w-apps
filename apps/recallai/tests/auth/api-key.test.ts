import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = (extra: Record<string, unknown> = {}) => ({
  apiKey: "SECRET",
  region: "us-west-2",
  ...extra,
});
// deno-lint-ignore no-explicit-any
const test = (c: any, ctx: any) => auth.test!({ credential: c } as any, ctx);

Deno.test("sign: sets `Authorization: Token <key>`", async () => {
  // deno-lint-ignore no-explicit-any
  const req = await auth.sign!({ request: { headers: {} }, credential: cred() } as any, {} as any);
  assertEquals((req as { headers: Record<string, string> }).headers.authorization, "Token SECRET");
});

Deno.test("fields: a region select over exactly the four documented regions, then a secret", () => {
  const region = auth.fields!.find((f) => f.key === "region")!;
  assertEquals(
    (region.options as { value: string }[]).map((o) => o.value),
    ["us-east-1", "us-west-2", "eu-central-1", "ap-northeast-1"],
  );
  assertEquals(auth.fields!.find((f) => f.key === "apiKey")!.type, "secret");
});

Deno.test("test: a 2xx with a results list is ok; the key never appears in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 0, next: null, previous: null, results: [] } }]);
  assertEquals(await test(cred(), ctx), { ok: true });
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v1/bot/?page=1");
  assertEquals(calls[0].headers.authorization, "Token SECRET");
  assert(!calls[0].url.includes("SECRET"));
});

Deno.test("test: each region hits its own host", async () => {
  for (
    const [region, host] of [
      ["us-east-1", "us-east-1.recall.ai"],
      ["eu-central-1", "eu-central-1.recall.ai"],
      ["ap-northeast-1", "ap-northeast-1.recall.ai"],
    ]
  ) {
    const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
    await test(cred({ region }), ctx);
    assertEquals(new URL(calls[0].url).host, host);
  }
});

Deno.test("test: a 2xx without results is not ok", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await test(cred(), ctx)).ok, false);
});

Deno.test("test: classifies by code, not status", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { code: "authentication_failed", detail: "Invalid API token. Might be another region" },
  }]);
  const r1 = await test(cred(), bad.ctx);
  assertEquals(r1.ok, false);
  assert(r1.message!.includes("authentication_failed"));
  assert(r1.message!.includes("us-west-2"));
  assert(!r1.message!.includes("SECRET"));

  // a 403 carrying an auth code is still a bad key; the status does not decide
  const odd = mockCtx([{ status: 403, body: { code: "not_authenticated", detail: "no creds" } }]);
  assertEquals((await test(cred(), odd.ctx)).ok, false);

  const blocked = mockCtx([{ status: 403, body: { code: "request_blocked", detail: "WAF" } }]);
  assert((await test(cred(), blocked.ctx)).message!.includes("firewall"));

  const broke = mockCtx([{ status: 402, body: { detail: "Insufficient credit balance" } }]);
  assertEquals(await test(cred(), broke.ctx), { ok: true });
});

Deno.test("test: a non-JSON body is not trusted, 5xx reports erroring, missing key fails", async () => {
  const html = mockCtx([{ status: 200, body: "<html>captive portal</html>" }]);
  assertEquals((await test(cred(), html.ctx)).ok, false);
  const blank = mockCtx([{ status: 403, body: "<html>blocked</html>" }]);
  assert((await test(cred(), blank.ctx)).message!.includes("non-error body"));
  const five = mockCtx([{ status: 503, body: { code: "unavailable", detail: "down" } }]);
  assert((await test(cred(), five.ctx)).message!.includes("erroring"));
  const { ctx } = mockCtx([]);
  assertEquals((await test(cred(), ctx)).ok, false);
  assertEquals((await test({ region: "us-west-2" }, ctx)).message, "credential missing apiKey");
});

Deno.test("afterConnect: records the region, defaulting an unknown one", async () => {
  // deno-lint-ignore no-explicit-any
  const run = (c: any) => auth.afterConnect!({ credential: c } as any, {} as any);
  assertEquals(await run(cred({ region: "eu-central-1" })), { region: "eu-central-1" });
  assertEquals(await run(cred({ region: "evil.example.com" })), { region: "us-west-2" });
});
