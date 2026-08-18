import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/token.ts";

const cred = { url: "https://abc.ui.nabu.casa", token: "eyJ-test" };
const running = { status: 200, body: { message: "API running." } };

Deno.test("token: signs as a bearer", () => {
  const request = {
    url: "https://abc.ui.nabu.casa/api/states",
    headers: {} as Record<string, string>,
  };
  const signed = auth.sign!(
    { request, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer eyJ-test");
  assertEquals(auth.type, "bearer");
});

Deno.test("token: the test hits the documented health endpoint", async () => {
  const { ctx, calls } = mockCtx([running]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/");
  assertEquals(calls[0].headers["authorization"], "Bearer eyJ-test");
  assertEquals(result.ok, true);
});

/**
 * The most common reason this fails: a hosted runner cannot see a home network,
 * and a bare timeout does not say so.
 */
Deno.test("token: an unreachable private address is explained, not reported as a timeout", async () => {
  for (
    const url of [
      "http://homeassistant.local:8123",
      "http://192.168.1.10:8123",
      "http://10.0.0.5:8123",
      "http://172.16.0.5:8123",
      "http://localhost:8123",
    ]
  ) {
    const ctx = {
      fetch: () => Promise.reject(new Error("ECONNREFUSED")),
      log: () => {},
    } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
    const result = await auth.test!({ credential: { ...cred, url } } as never, ctx);
    assertEquals(result.ok, false);
    assert(/private address/.test(result.message!), `${url}: ${result.message}`);
    assert(/Nabu Casa/.test(result.message!), result.message);
  }
});

Deno.test("token: an unreachable public address is reported plainly", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(!/private address/.test(result.message!), result.message);
});

Deno.test("token: a rejected token explains that tokens are revocable", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthorized" } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/revocable/.test(result.message!), result.message);
});

/** A reverse proxy serving its own login page answers 200 with HTML. */
Deno.test("token: an HTML body is named as a proxy rather than parsed", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html><body>Sign in</body></html>" }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/reverse proxy or a login page/.test(result.message!), result.message);
});

Deno.test("token: a JSON body that is not the health message is not accepted", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { message: "something else" } }]);
  assertEquals((await auth.test!({ credential: cred } as never, ctx)).ok, false);
});

Deno.test("token: missing fields fail before any request", async () => {
  const noUrl = mockCtx([]);
  assertEquals((await auth.test!({ credential: { token: "x" } } as never, noUrl.ctx)).ok, false);
  assertEquals(noUrl.calls.length, 0);

  const noToken = mockCtx([]);
  assertEquals(
    (await auth.test!({ credential: { url: "https://x.com" } } as never, noToken.ctx)).ok,
    false,
  );
  assertEquals(noToken.calls.length, 0);
});

Deno.test("token: afterConnect records the installation's own name", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { location_name: "Home", version: "2026.8.1" },
  }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/config");
  assertEquals(display, {
    url: "https://abc.ui.nabu.casa",
    locationName: "Home",
    version: "2026.8.1",
  });
});

Deno.test("token: afterConnect still records the URL when config is unavailable", async () => {
  const { ctx } = mockCtx([{ status: 403, body: {} }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(display, { url: "https://abc.ui.nabu.casa" });
});

/** There are no scopes on this API, so the token is as powerful as its creator. */
Deno.test("token: the hints warn about permissions and reachability", () => {
  const tokenField = auth.fields!.find((f) => f.key === "token")!;
  assert(/non-admin user/.test(tokenField.hint!), tokenField.hint);
  assertEquals(tokenField.type, "secret");

  const urlField = auth.fields!.find((f) => f.key === "url")!;
  assert(/same network/.test(urlField.hint!), urlField.hint);
  assert(/FULL permissions/.test(auth.description!), auth.description);
});
