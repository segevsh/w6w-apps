import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  baseUrlFromConnection,
  buildBaseUrl,
  describeError,
  endpointLabel,
  format,
  images,
  isPrivateHost,
  keepAlive,
  modelOptions,
  parseEndpoint,
  think,
} from "../../lib/client.ts";

Deno.test("buildBaseUrl: defaults to http and port 11434", () => {
  assertEquals(buildBaseUrl({ host: "192.168.1.50" }), "http://192.168.1.50:11434");
  assertEquals(
    buildBaseUrl({ host: "192.168.1.50", port: "", scheme: "" }),
    "http://192.168.1.50:11434",
  );
});

Deno.test("buildBaseUrl: scheme, hostname and port come from the three fields", () => {
  assertEquals(
    buildBaseUrl({ scheme: "HTTPS", host: " Ollama.Example.COM ", port: "443" }),
    "https://ollama.example.com:443",
  );
  assertEquals(buildBaseUrl({ host: "gpu-box", port: 8080 }), "http://gpu-box:8080");
  assertEquals(buildBaseUrl({ host: "localhost" }), "http://localhost:11434");
});

Deno.test("buildBaseUrl: IPv6 is bracketed whether or not the user brackets it", () => {
  assertEquals(buildBaseUrl({ host: "::1" }), "http://[::1]:11434");
  assertEquals(buildBaseUrl({ host: "[::1]", port: 9 }), "http://[::1]:9");
  assertEquals(endpointLabel({ host: "::1", port: 11434 }), "[::1]:11434");
});

Deno.test("buildBaseUrl: the port must be a whole number from 1 to 65535", () => {
  for (const port of ["0", "65536", "-1", "11434.5", "abc", "1e3", "0x50"]) {
    assertThrows(() => buildBaseUrl({ host: "h", port }), Error, "port", port);
  }
  assertEquals(buildBaseUrl({ host: "h", port: 1 }), "http://h:1");
  assertEquals(buildBaseUrl({ host: "h", port: 65535 }), "http://h:65535");
});

Deno.test("buildBaseUrl: only http and https", () => {
  assertThrows(() => buildBaseUrl({ host: "h", scheme: "ftp" }), Error, "scheme");
  assertThrows(() => buildBaseUrl({ host: "h", scheme: "javascript:" }), Error, "scheme");
});

Deno.test("buildBaseUrl: a path, credentials, a query or a second host cannot ride in the host", () => {
  const bad = [
    "http://192.168.1.50",
    "192.168.1.50/api",
    "192.168.1.50/",
    "user:pass@192.168.1.50",
    "user@192.168.1.50",
    "evil.com@192.168.1.50",
    "192.168.1.50?x=1",
    "192.168.1.50#frag",
    "192.168.1.50:11434",
    "host name",
    "a.com\\b.com",
    "192.168.1.50%2f",
    "-bad.example",
    "bad-.example",
    "a..b",
    "",
    "   ",
    "[::1",
    "[not-ipv6]",
  ];
  for (const host of bad) {
    assertThrows(() => buildBaseUrl({ host }), Error, undefined, JSON.stringify(host));
  }
});

Deno.test("buildBaseUrl: an address the URL parser would read differently is refused", () => {
  // `192.168.1.050` would silently become 192.168.1.40; `1234` becomes 0.0.4.210.
  assertThrows(() => buildBaseUrl({ host: "192.168.1.050" }), Error, "is read as");
  assertThrows(() => buildBaseUrl({ host: "1234" }), Error, "is read as");
  assertThrows(() => buildBaseUrl({ host: "999.1.1.1" }), Error);
});

Deno.test("parseEndpoint: the messages say which field each part belongs in", () => {
  assertThrows(() => parseEndpoint({ host: "http://x" }), Error, "Scheme field");
  assertThrows(() => parseEndpoint({ host: "x:1" }), Error, "Port field");
  assertThrows(() => parseEndpoint({ host: "u@x" }), Error, "API key");
  assertThrows(() => parseEndpoint({}), Error, "host");
});

Deno.test("baseUrlFromConnection: rebuilds and re-validates from the display record", () => {
  const url = baseUrlFromConnection({
    display: { scheme: "https", host: "o.example.com", port: 8443 },
  } as never);
  assertEquals(url, "https://o.example.com:8443");
  assertThrows(() => baseUrlFromConnection(undefined), Error, "reconnect");
  assertThrows(
    () => baseUrlFromConnection({ display: { host: "evil.com/x" } } as never),
    Error,
  );
});

Deno.test("isPrivateHost: LAN, loopback, CGNAT and bare names are private; public hosts are not", () => {
  for (
    const h of [
      "localhost",
      "127.0.0.1",
      "10.1.2.3",
      "192.168.1.50",
      "172.16.0.1",
      "172.31.255.1",
      "169.254.1.1",
      "100.64.0.1",
      "100.100.1.1",
      "::1",
      "[::1]",
      "fd00::1",
      "nas.local",
      "gpu.lan",
      "ollama",
    ]
  ) assert(isPrivateHost(h), h);
  for (const h of ["8.8.8.8", "172.32.0.1", "100.128.0.1", "ollama.example.com", "203.0.113.9"]) {
    assert(!isPrivateHost(h), h);
  }
});

Deno.test("keepAlive: bare numbers become numbers, durations stay strings", () => {
  assertEquals(keepAlive("0"), 0);
  assertEquals(keepAlive("-1"), -1);
  assertEquals(keepAlive(300), 300);
  assertEquals(keepAlive("10m"), "10m");
  assertEquals(keepAlive(""), undefined);
  assertEquals(keepAlive(undefined), undefined);
});

Deno.test("images: strips data-URI prefixes and accepts arrays, JSON and line lists", () => {
  assertEquals(images(["data:image/jpeg;base64,AAA", " BBB "]), ["AAA", "BBB"]);
  assertEquals(images('["AAA","BBB"]'), ["AAA", "BBB"]);
  assertEquals(images("AAA\nBBB"), ["AAA", "BBB"]);
  assertEquals(images(""), undefined);
  assertEquals(images([]), undefined);
});

Deno.test("format: blank, json, or a schema object — nothing else", () => {
  assertEquals(format(""), undefined);
  assertEquals(format("JSON"), "json");
  assertEquals(format('{"type":"object"}'), { type: "object" });
  assertThrows(() => format('"text"'), Error, "`format`");
  assertThrows(() => format("{nope"), Error, "not valid JSON");
});

Deno.test("think: booleans, effort levels, blank", () => {
  assertEquals(think(""), undefined);
  assertEquals(think("true"), true);
  assertEquals(think(false), false);
  assertEquals(think("HIGH"), "high");
  assertThrows(() => think("loud"), Error);
});

Deno.test("modelOptions: named options win over the free-form object", () => {
  assertEquals(
    modelOptions({ options: { top_k: 5, seed: 1 }, seed: 42, numPredict: 100 }),
    { top_k: 5, seed: 42, num_predict: 100 },
  );
  assertEquals(modelOptions({}), undefined);
  assertEquals(modelOptions({ temperature: 0 }), { temperature: 0 });
  assertThrows(() => modelOptions({ options: "[1]" }), Error, "JSON object");
  assertThrows(() => modelOptions({ temperature: "hot" }), Error, "number");
});

Deno.test("describeError: reads Ollama's error field and names the likely cause", () => {
  assert(/not found/.test(describeError(404, '{"error":"model \'x\' not found"}')));
  assert(/model-pull/.test(describeError(404, "{}")));
  assert(/reverse proxy/.test(describeError(401, "")));
  assert(/gateway/.test(describeError(504, "<html>")));
  assertEquals(describeError(400, '{"error":"bad thing"}'), "bad thing");
});
