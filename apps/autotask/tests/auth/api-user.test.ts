import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-user.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { username: "api@x.com", secret: "S3", integrationCode: "CODE", zone: "2" };

Deno.test("sign: stamps the three headers and a JSON content type on a body", () => {
  const signed = auth.sign!({
    request: {
      url: "https://webservices2.autotask.net/x",
      method: "POST",
      headers: {},
      body: "{}",
    },
    credential: cred,
  } as never, mockCtx([]).ctx) as { headers: Record<string, string> };
  assertEquals(signed.headers.UserName, "api@x.com");
  assertEquals(signed.headers.Secret, "S3");
  assertEquals(signed.headers.ApiIntegrationCode, "CODE");
  assertEquals(signed.headers["content-type"], "application/json");
});

Deno.test("fields: the three credentials are not exposed as plain strings, zone is a select", () => {
  const byKey = Object.fromEntries(auth.fields!.map((f) => [f.key, f]));
  assertEquals(byKey.secret.type, "secret");
  assertEquals(byKey.integrationCode.type, "secret");
  assertEquals(byKey.zone.type, "select");
  assertEquals((byKey.zone.options as unknown[]).length, 20);
});

const zoneInfo = (n: number) => ({
  zoneName: "America East",
  url: `https://webservices${n}.autotask.net/ATServicesRest/`,
  webUrl: `https://ww${n}.autotask.net/`,
  ci: 1,
});

Deno.test("test: ok on a zone match and a Version document, signed with the three headers", async () => {
  const { ctx, calls } = mockCtx([
    { body: zoneInfo(2) },
    { body: { majorVersion: "2", minorVersion: "0", build: "1" } },
  ]);
  const res = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(res.ok, true);
  assertEquals(calls[0].url.startsWith("https://webservices.autotask.net/"), true);
  assertEquals(calls[0].headers["secret"], undefined, "discovery is unsigned");
  assertEquals(calls[1].url, "https://webservices2.autotask.net/atservicesrest/V1.0/Version");
  assertEquals(calls[1].headers["apiintegrationcode"], "CODE");
});

Deno.test("test: a zone mismatch names the right zone and never probes the wrong host", async () => {
  const { ctx, calls } = mockCtx([{ body: zoneInfo(5) }]);
  const res = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("zone 5"));
  assertEquals(calls.length, 1);
});

Deno.test("test: an unknown username is reported from the zone lookup's error body", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: { errors: ["Zone information could not be determined"] },
  }]);
  const res = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("does not recognise this username"));
});

Deno.test("test: the empty 401 lists every candidate rather than guessing one", async () => {
  const { ctx } = mockCtx([{ body: zoneInfo(2) }, { status: 401, body: "" }]);
  const res = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("wrong secret") && res.message!.includes("integration code"));
});

Deno.test("test: discovery being down does not fail a good credential", async () => {
  const { ctx } = mockCtx([
    { status: 503, body: "<html>" },
    { body: { majorVersion: "2", minorVersion: "1" } },
  ]);
  assertEquals((await auth.test!({ credential: cred } as never, ctx)).ok, true);
});

Deno.test("test: missing pieces and an unpublished zone are refused before any request", async () => {
  for (
    const bad of [
      { ...cred, username: "" },
      { ...cred, secret: "" },
      { ...cred, integrationCode: "" },
      { ...cred, zone: "7" },
    ]
  ) {
    const { ctx, calls } = mockCtx([]);
    assertEquals((await auth.test!({ credential: bad } as never, ctx)).ok, false);
    assertEquals(calls.length, 0);
  }
});

Deno.test("afterConnect: records the zone for the actions to read", async () => {
  assertEquals(await auth.afterConnect!({ credential: cred } as never, mockCtx([]).ctx), {
    zone: "2",
  });
});
