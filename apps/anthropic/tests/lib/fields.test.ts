import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { resolveAnthropicFields } from "../../lib/fields.ts";
import messageCreate from "../../actions/message-create.ts";
import countTokens from "../../actions/count-tokens.ts";

const model = (id: string, created_at: string, display_name?: string) => ({
  id,
  created_at,
  ...(display_name ? { display_name } : {}),
});

Deno.test("resolveAnthropicFields: one page, sorted by created_at desc, option shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [
        model("old", "2024-01-01T00:00:00Z", "Old"),
        model("new", "2026-01-01T00:00:00Z", "New"),
        model("mid", "2025-01-01T00:00:00Z", "Mid"),
      ],
      has_more: false,
    },
  }]);
  const out = await resolveAnthropicFields({
    fields: ["model"],
    form: {},
    unresolved: [],
    reason: "init",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.anthropic.com/v1/models?limit=1000");
  assertEquals(out.fields.model?.options?.map((o) => o.value), ["new", "mid", "old"]);
  assertEquals(out.fields.model?.options?.[0].label, "New");
  assertEquals(out.fields.model?.options?.[0].description, "2026-01-01T00:00:00Z");
});

Deno.test("resolveAnthropicFields: label falls back to id", async () => {
  const { ctx } = mockCtx([{
    body: { data: [model("m1", "2025-01-01T00:00:00Z")], has_more: false },
  }]);
  const out = await resolveAnthropicFields({
    fields: ["model"],
    form: {},
    unresolved: [],
    reason: "init",
  }, ctx);
  assertEquals(out.fields.model?.options?.[0].label, "m1");
});

Deno.test("resolveAnthropicFields: pages with after_id while has_more", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: [model("a", "2025-01-01T00:00:00Z")], has_more: true, last_id: "a" } },
    { body: { data: [model("b", "2026-01-01T00:00:00Z")], has_more: false, last_id: "b" } },
  ]);
  const out = await resolveAnthropicFields({
    fields: ["model"],
    form: {},
    unresolved: [],
    reason: "init",
  }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(calls[1].url, "https://api.anthropic.com/v1/models?limit=1000&after_id=a");
  assertEquals(out.fields.model?.options?.map((o) => o.value), ["b", "a"]);
});

Deno.test("resolveAnthropicFields: caps at 1000 options, no third request", async () => {
  const mk = (p: string) =>
    Array.from({ length: 600 }, (_, i) => model(`${p}${i}`, "2025-01-01T00:00:00Z"));
  const { ctx, calls } = mockCtx([
    { body: { data: mk("a"), has_more: true, last_id: "a599" } },
    { body: { data: mk("b"), has_more: true, last_id: "b599" } },
  ]);
  const out = await resolveAnthropicFields({
    fields: ["model"],
    form: {},
    unresolved: [],
    reason: "init",
  }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.fields.model?.options?.length, 1000);
});

Deno.test("resolveAnthropicFields: model not requested -> zero requests", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await resolveAnthropicFields({
    fields: ["other"],
    form: {},
    unresolved: [],
    reason: "init",
  }, ctx);
  assertEquals(calls.length, 0);
  assertEquals(out, { fields: {} });
});

Deno.test("resolveAnthropicFields: non-2xx throws", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "nope" } }]);
  await assertRejects(
    async () =>
      await resolveAnthropicFields(
        { fields: ["model"], form: {}, unresolved: [], reason: "init" },
        ctx,
      ),
    Error,
    "Anthropic 401",
  );
});

for (
  const [name, action] of [["message-create", messageCreate], [
    "count-tokens",
    countTokens,
  ]] as const
) {
  Deno.test(`${name}: model param is a live overridable picker`, () => {
    const p = action.params!.find((x) => x.key === "model")!;
    assertEquals(p.type, "string");
    assertEquals(p.required, true);
    assertEquals(p.default, "claude-opus-4-1-20250805");
    assertEquals(p.options, { source: "resolveFields" });
    assertEquals(p.config, { allowCustom: true });
    assertEquals(action.resolveFields, resolveAnthropicFields);
  });
}

Deno.test("message-create: model hint lists no ids", () => {
  const p = messageCreate.params!.find((x) => x.key === "model")!;
  assertEquals(/claude-/.test(p.hint ?? ""), false);
});
