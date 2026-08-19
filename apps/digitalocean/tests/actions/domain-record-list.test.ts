import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/domain-record-list.ts";

const page = (records: Array<[string, string, string, number]>) => ({
  status: 200,
  body: {
    domain_records: records.map(([type, name, data, ttl], i) => ({
      id: 100 + i,
      type,
      name,
      data,
      ttl,
    })),
    meta: { total: records.length },
  },
});

/** `@` is the domain itself, never the fully-qualified form. */
Deno.test("domain-record-list: adds the qualified name, resolving @", async () => {
  const { ctx, calls } = mockCtx([page([
    ["A", "@", "203.0.113.1", 3600],
    ["A", "www", "203.0.113.1", 3600],
  ])]);
  const result = await action.execute({ domain: "example.com" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v2/domains/example.com/records");
  const records = result.records as Array<Record<string, unknown>>;
  assertEquals(records[0].qualifiedName, "example.com");
  assertEquals(records[1].qualifiedName, "www.example.com");
});

/** Without the dot the target is read relative to the domain. */
Deno.test("domain-record-list: flags CNAME data missing its trailing dot", async () => {
  const { ctx, logs } = mockCtx([page([
    ["CNAME", "www", "example.com", 3600],
    ["CNAME", "cdn", "target.example.net.", 3600],
  ])]);
  const result = await action.execute({ domain: "example.com" }, ctx) as Record<string, unknown>;
  assertEquals(result.suspiciousCnames, ["www.example.com → example.com"]);
  assertEquals(logs[0].level, "warn");
  assert(/example\.com\.example\.com/.test(logs[0].message), logs[0].message);
});

Deno.test("domain-record-list: correct records do not warn", async () => {
  const { ctx, logs } = mockCtx([page([["A", "www", "203.0.113.1", 300]])]);
  const result = await action.execute({ domain: "example.com" }, ctx) as Record<string, unknown>;
  assertEquals(result.suspiciousCnames, []);
  assertEquals(logs.length, 0);
});

/** The TTL is the length of the window a mistake keeps being served. */
Deno.test("domain-record-list: reports the longest TTL", async () => {
  const { ctx } = mockCtx([page([
    ["A", "www", "203.0.113.1", 300],
    ["A", "api", "203.0.113.2", 86400],
  ])]);
  const result = await action.execute({ domain: "example.com" }, ctx) as Record<string, unknown>;
  assertEquals(result.longestTtl, 86400);
  assertEquals(result.types, ["A"]);
});

Deno.test("domain-record-list: a trailing dot on the domain is stripped", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute({ domain: "example.com." }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/domains/example.com/records");
});

Deno.test("domain-record-list: a domain is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`domain` is required/.test(message), message);
  assertEquals(calls.length, 0);
});
