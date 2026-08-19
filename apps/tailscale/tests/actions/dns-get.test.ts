import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/dns-get.ts";

const responses = (
  nameservers: string[],
  magicDNS: boolean,
  split: Record<string, string[]> = {},
) => [
  { status: 200, body: { dns: nameservers } },
  { status: 200, body: { magicDNS } },
  { status: 200, body: { searchPaths: ["corp.example.com"] } },
  { status: 200, body: split },
];

/** Four endpoints that are one setting in practice. */
Deno.test("dns-get: reads all four DNS endpoints", async () => {
  const { ctx, calls } = mockCtx(responses(["8.8.8.8"], true));
  const result = await action.execute({}, ctx) as Record<string, unknown>;

  assertEquals(calls.map((call) => new URL(call.url).pathname), [
    "/api/v2/tailnet/-/dns/nameservers",
    "/api/v2/tailnet/-/dns/preferences",
    "/api/v2/tailnet/-/dns/searchpaths",
    "/api/v2/tailnet/-/dns/split-dns",
  ]);
  assertEquals(result.nameservers, ["8.8.8.8"]);
  assertEquals(result.magicDNS, true);
  assertEquals(result.searchPaths, ["corp.example.com"]);
});

/** Removing the last nameserver turns MagicDNS off; adding one back does not turn it on. */
Deno.test("dns-get: flags MagicDNS on with no nameserver, and warns", async () => {
  const { ctx, logs } = mockCtx(responses([], true));
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.magicDNSAtRisk, true);
  assert(
    logs.some((l) => l.level === "warn" && /does not switch it on again/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("dns-get: a healthy configuration warns about nothing", async () => {
  const { ctx, logs } = mockCtx(responses(["1.1.1.1"], true));
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.magicDNSAtRisk, false);
  assertEquals(logs.length, 0);
});

/** A private resolver depends on a subnet route, and a withdrawn route looks like broken DNS. */
Deno.test("dns-get: names split-DNS resolvers on private addresses", async () => {
  const { ctx } = mockCtx(responses(["8.8.8.8"], true, {
    "corp.example.com": ["10.1.2.3"],
    "partner.example.com": ["9.9.9.9"],
    "lab.example.com": ["192.168.5.1", "172.16.0.1"],
  }));
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.splitDNSDomains, [
    "corp.example.com",
    "partner.example.com",
    "lab.example.com",
  ]);
  assertEquals(result.privateResolvers, [
    { domain: "corp.example.com", resolver: "10.1.2.3" },
    { domain: "lab.example.com", resolver: "192.168.5.1" },
    { domain: "lab.example.com", resolver: "172.16.0.1" },
  ]);
});

/** 172.15 and 172.32 are public; only 172.16–172.31 are not. */
Deno.test("dns-get: the private-address test does not overreach into 172.x", async () => {
  const { ctx } = mockCtx(responses(["8.8.8.8"], true, {
    "a.example.com": ["172.15.0.1"],
    "b.example.com": ["172.32.0.1"],
    "c.example.com": ["172.31.255.254"],
  }));
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.privateResolvers, [
    { domain: "c.example.com", resolver: "172.31.255.254" },
  ]);
});

Deno.test("dns-get: takes no parameters", () => {
  assertEquals(action.params, []);
  assertEquals(action.type, "read");
});
