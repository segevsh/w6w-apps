import { assertEquals, assertRejects } from "@std/assert";
import { cfOk, mockCtx } from "../_helpers.ts";
import action from "../../actions/dns-record-create.ts";

function baseInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    zoneId: "z1",
    type: "A",
    name: "www",
    content: "1.2.3.4",
    ttl: 1,
    ...overrides,
  };
}

Deno.test("dns-record-create: POSTs to /zones/{id}/dns_records", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: cfOk({ id: "r1", type: "A", name: "www", content: "1.2.3.4" }) },
  ]);
  const result = await action.execute!(baseInput(), ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.cloudflare.com/client/v4/zones/z1/dns_records");
  assertEquals(calls[0].headers["content-type"], "application/json");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body, { type: "A", name: "www", content: "1.2.3.4", ttl: 1 });
  assertEquals(result, { id: "r1", type: "A", name: "www", content: "1.2.3.4" });
});

Deno.test("dns-record-create: proxied is included only when true", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: cfOk({}) }]);
  await action.execute!(baseInput({ proxied: true }), ctx);
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.proxied, true);
});

Deno.test("dns-record-create: MX record requires priority", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!(
        baseInput({ type: "MX", content: "mail.example.com", priority: 0 }),
        ctx,
      ),
    Error,
    "`priority`",
  );
});

Deno.test("dns-record-create: MX record with priority sends it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: cfOk({}) }]);
  await action.execute!(
    baseInput({ type: "MX", content: "mail.example.com", priority: 10 }),
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.priority, 10);
});

Deno.test("dns-record-create: missing required fields reject with informative errors", async () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["zoneId", { zoneId: "" }],
    ["type", { type: "" }],
    ["name", { name: "" }],
    ["content", { content: "" }],
  ];
  for (const [field, patch] of cases) {
    const { ctx } = mockCtx();
    await assertRejects(
      async () => await action.execute!(baseInput(patch), ctx),
      Error,
      `\`${field}\``,
    );
  }
});
