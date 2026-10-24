import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/server.ts";

const cred = { scheme: "http", host: "192.168.1.50", port: 11434 };
const version = { status: 200, body: { version: "0.34.1" } };

const failingCtx = (message = "ECONNREFUSED") =>
  ({
    fetch: () => Promise.reject(new Error(message)),
    log: () => {},
  }) as unknown as Parameters<NonNullable<typeof auth.test>>[1];

Deno.test("server: the contract's only secret-free option is `custom`, with the key optional", () => {
  assertEquals(auth.type, "custom");
  const fields = Object.fromEntries(auth.fields!.map((f) => [f.key, f]));
  assertEquals(Object.keys(fields), ["host", "port", "scheme", "apiKey"]);
  assertEquals(fields.host.required, true);
  assertEquals(fields.apiKey.required, false);
  assertEquals(fields.apiKey.type, "secret");
  assertEquals(fields.port.default, 11434);
  assertEquals(fields.scheme.default, "http");
  assertEquals(
    (fields.scheme.options as Array<{ value: string }>).map((o) => o.value),
    ["http", "https"],
  );
});

Deno.test("server: sign adds a bearer only when a key was entered", () => {
  const sign = (credential: unknown) => {
    const request = { url: "http://x/api/tags", headers: {} as Record<string, string> };
    return (auth.sign!({ request, credential } as never, mockCtx([]).ctx) as typeof request)
      .headers;
  };
  assertEquals(sign({ ...cred, apiKey: " sk-test " })["authorization"], "Bearer sk-test");
  assertEquals(sign(cred)["authorization"], undefined);
  assertEquals(sign({ ...cred, apiKey: "" })["authorization"], undefined);
  assertEquals(sign({ ...cred, apiKey: "   " })["authorization"], undefined);
});

Deno.test("server: the test hits /api/version on the address built from the fields", async () => {
  const { ctx, calls } = mockCtx([version]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].url, "http://192.168.1.50:11434/api/version");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result.ok, true);
  assert(/0\.34\.1/.test(result.message!), result.message);
});

Deno.test("server: a custom port and https are honoured, and the key is sent when set", async () => {
  const { ctx, calls } = mockCtx([version]);
  await auth.test!({
    credential: { scheme: "https", host: "ollama.example.com", port: "443", apiKey: "k" },
  } as never, ctx);
  assertEquals(calls[0].url, "https://ollama.example.com:443/api/version");
  assertEquals(calls[0].headers["authorization"], "Bearer k");
});

/** The most common failure: reported as what it is, not as a timeout. */
Deno.test("server: an unreachable LAN address is explained, not reported as a timeout", async () => {
  for (const host of ["192.168.1.50", "10.0.0.5", "localhost", "nas.local", "100.64.1.2"]) {
    const result = await auth.test!({ credential: { ...cred, host } } as never, failingCtx());
    assertEquals(result.ok, false);
    assert(/private\/LAN address/.test(result.message!), `${host}: ${result.message}`);
    assert(/self-hosted runner/.test(result.message!), result.message);
    assert(/tunnel or a reverse proxy/.test(result.message!), result.message);
    assert(/OLLAMA_HOST=0\.0\.0\.0/.test(result.message!), result.message);
    assert(/ECONNREFUSED/.test(result.message!), result.message);
  }
});

Deno.test("server: an unreachable public host is reported plainly but still names OLLAMA_HOST", async () => {
  const result = await auth.test!(
    { credential: { ...cred, host: "ollama.example.com" } } as never,
    failingCtx("dns error"),
  );
  assertEquals(result.ok, false);
  assert(!/private\/LAN/.test(result.message!), result.message);
  assert(/ollama\.example\.com:11434/.test(result.message!), result.message);
  assert(/OLLAMA_HOST/.test(result.message!), result.message);
});

Deno.test("server: a 401 without a key says a proxy is in the way; with a key it says it was rejected", async () => {
  const noKey = await auth.test!(
    { credential: cred } as never,
    mockCtx([{ status: 401, body: "no" }]).ctx,
  );
  assertEquals(noKey.ok, false);
  assert(/requires an API key/.test(noKey.message!), noKey.message);

  const withKey = await auth.test!(
    { credential: { ...cred, apiKey: "bad" } } as never,
    mockCtx([{ status: 403, body: "no" }]).ctx,
  );
  assertEquals(withKey.ok, false);
  assert(/rejected the API key/.test(withKey.message!), withKey.message);
  assert(!/bad/.test(withKey.message!.replace("rejected", "")), "the key must not be echoed");
});

Deno.test("server: a 200 that is not Ollama is named as the wrong port or a proxy page", async () => {
  for (const body of ["<html>Login</html>", { hello: "world" }]) {
    const result = await auth.test!(
      { credential: cred } as never,
      mockCtx([{ status: 200, body }]).ctx,
    );
    assertEquals(result.ok, false);
    assert(/not like Ollama/.test(result.message!), result.message);
  }
});

Deno.test("server: a bad address fails before any request", async () => {
  for (
    const bad of [
      { ...cred, host: "" },
      { ...cred, host: "http://192.168.1.50" },
      { ...cred, host: "evil.com/x" },
      { ...cred, port: 70000 },
      { ...cred, scheme: "ftp" },
    ]
  ) {
    const { ctx, calls } = mockCtx([]);
    const result = await auth.test!({ credential: bad } as never, ctx);
    assertEquals(result.ok, false);
    assertEquals(calls.length, 0);
  }
});

Deno.test("server: afterConnect records the address and version, never the key", async () => {
  const { ctx, calls } = mockCtx([version]);
  const display = await auth.afterConnect!(
    { credential: { ...cred, apiKey: "sk-secret" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].headers["authorization"], "Bearer sk-secret");
  assertEquals(display, {
    baseUrl: "http://192.168.1.50:11434",
    scheme: "http",
    host: "192.168.1.50",
    port: 11434,
    endpoint: "192.168.1.50:11434",
    authenticated: true,
    version: "0.34.1",
  });
  assert(!JSON.stringify(display).includes("sk-secret"));
});

Deno.test("server: afterConnect still records the address when the server will not answer", async () => {
  const display = await auth.afterConnect!({ credential: cred }, failingCtx()) as Record<
    string,
    unknown
  >;
  assertEquals(display.endpoint, "192.168.1.50:11434");
  assertEquals(display.authenticated, false);
  assertEquals(display.version, undefined);
});

Deno.test("server: the hints carry the reachability and bind-address warnings", () => {
  const host = auth.fields!.find((f) => f.key === "host")!;
  assert(/same network/.test(host.hint!), host.hint);
  assert(/self-hosted runner/.test(host.hint!), host.hint);
  assert(/tunnel or reverse proxy/.test(host.hint!), host.hint);
  assert(/OLLAMA_HOST=0\.0\.0\.0/.test(host.hint!), host.hint);
  assert(/127\.0\.0\.1/.test(host.hint!), host.hint);
  assert(/no authentication/i.test(auth.fields!.find((f) => f.key === "apiKey")!.hint!));
});
