import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/domain-record-create.ts";

const created = (attributes: Record<string, unknown> = {}) => ({
  status: 201,
  body: {
    domain_record: { id: 123, name: "www", data: "203.0.113.1", ttl: 300, ...attributes },
  },
});

Deno.test("domain-record-create: posts the record and returns the qualified name", async () => {
  const { ctx, calls } = mockCtx([created()]);
  const result = await action.execute({
    domain: "example.com",
    type: "A",
    name: "www",
    data: "203.0.113.1",
  }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v2/domains/example.com/records");
  assertEquals(JSON.parse(calls[0].body!).name, "www");
  assertEquals(result.qualifiedName, "www.example.com");
});

/** The commonest DNS mistake, and the API accepts it silently. */
Deno.test("domain-record-create: a fully-qualified name is refused, with the fix", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({
      domain: "example.com",
      type: "A",
      name: "www.example.com",
      data: "203.0.113.1",
    }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/would create "www\.example\.com\.example\.com"/.test(message), message);
  assert(/Use "www" instead/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("domain-record-create: the domain itself as a name is refused, pointing at @", async () => {
  const { ctx } = mockCtx([]);
  let message = "";
  try {
    await action.execute({
      domain: "example.com",
      type: "A",
      name: "example.com",
      data: "203.0.113.1",
    }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/Use "@" instead/.test(message), message);
});

Deno.test("domain-record-create: @ itself is accepted", async () => {
  const { ctx, calls } = mockCtx([created({ name: "@" })]);
  const result = await action.execute({
    domain: "example.com",
    type: "A",
    name: "@",
    data: "203.0.113.1",
  }, ctx) as Record<string, unknown>;
  assertEquals(JSON.parse(calls[0].body!).name, "@");
  assertEquals(result.qualifiedName, "example.com");
});

/** Without the dot the target is read relative to the domain. */
Deno.test("domain-record-create: a trailing dot is added to CNAME, MX and NS data", async () => {
  for (const type of ["CNAME", "MX", "NS"]) {
    const { ctx, calls } = mockCtx([created()]);
    await action.execute({
      domain: "example.com",
      type,
      name: "www",
      data: "target.example.net",
      priority: 10,
    }, ctx);
    assertEquals(JSON.parse(calls[0].body!).data, "target.example.net.", type);
  }

  // An A record's data is an address and is left alone.
  const a = mockCtx([created()]);
  await action.execute({
    domain: "example.com",
    type: "A",
    name: "www",
    data: "203.0.113.1",
  }, a.ctx);
  assertEquals(JSON.parse(a.calls[0].body!).data, "203.0.113.1");
});

/** Start low and raise it once the record is proven. */
Deno.test("domain-record-create: the TTL defaults to 300, not DigitalOcean's 1800", async () => {
  const { ctx, calls } = mockCtx([created()]);
  await action.execute({
    domain: "example.com",
    type: "A",
    name: "www",
    data: "203.0.113.1",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).ttl, 300);
  assertEquals(action.params!.find((p) => p.key === "ttl")!.default, 300);
});

/** A TXT record carries verification tokens. */
Deno.test("domain-record-create: logs the name and type, never the data", async () => {
  const { ctx, logs } = mockCtx([created()]);
  await action.execute({
    domain: "example.com",
    type: "TXT",
    name: "_acme-challenge",
    data: "secret-validation-token",
  }, ctx);
  assertEquals(JSON.stringify(logs).includes("secret-validation-token"), false);
});

Deno.test("domain-record-create: the required fields are checked", async () => {
  for (const field of ["domain", "name", "data"]) {
    const { ctx, calls } = mockCtx([]);
    const input: Record<string, unknown> = {
      domain: "example.com",
      type: "A",
      name: "www",
      data: "203.0.113.1",
    };
    input[field] = "";
    let message = "";
    try {
      await action.execute(input, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(new RegExp(`\`${field}\` is required`).test(message), message);
    assertEquals(calls.length, 0);
  }
});
