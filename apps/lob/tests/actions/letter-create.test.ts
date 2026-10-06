import { assertEquals, assertRejects } from "@std/assert";
import letterCreate from "../../actions/letter-create.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

const addr = {
  name: "Harry Zhang",
  address_line1: "210 King St",
  address_city: "San Francisco",
  address_state: "CA",
  address_zip: "94107",
};

Deno.test("letter-create: POSTs the documented body to /letters", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x_1", url: "https://lob-assets.com/x.pdf" } }]);
  const out = await letterCreate.execute({
    to: "adr_1",
    from: "adr_2",
    file: "tmpl_letter",
    color: true,
    useType: "operational" as const,
    extraService: "certified",
  }, ctx) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/letters");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    to: "adr_1",
    from: "adr_2",
    use_type: "operational",
    file: "tmpl_letter",
    color: true,
    extra_service: "certified",
  });
  assertEquals(out.id, "x_1");
});

Deno.test("letter-create: a saved address id passes through as a string, an inline address as an object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x_2" } }]);
  await letterCreate.execute({
    ...{
      to: "adr_1",
      from: "adr_2",
      file: "tmpl_letter",
      color: true,
      useType: "operational" as const,
      extraService: "certified",
    },
    to: "adr_123",
  }, ctx);
  assertEquals(bodyOf(calls[0]).to, "adr_123");
  const second = mockCtx([{ body: { id: "x_3" } }]);
  await letterCreate.execute({
    ...{
      to: "adr_1",
      from: "adr_2",
      file: "tmpl_letter",
      color: true,
      useType: "operational" as const,
      extraService: "certified",
    },
    to: JSON.stringify(addr),
  }, second.ctx);
  assertEquals(bodyOf(second.calls[0]).to, addr);
});

Deno.test("letter-create: Idempotency-Key is the caller's own, else the invocation id, else absent", async () => {
  const own = mockCtx([{ body: { id: "a" } }]);
  await letterCreate.execute({
    ...{
      to: "adr_1",
      from: "adr_2",
      file: "tmpl_letter",
      color: true,
      useType: "operational" as const,
      extraService: "certified",
    },
    idempotencyKey: "my-key",
  }, own.ctx);
  assertEquals(own.calls[0].headers["idempotency-key"], "my-key");

  const inv = mockCtx([{ body: { id: "b" } }]);
  (inv.ctx as { invocation?: unknown }).invocation = { invocationId: "inv-42" };
  await letterCreate.execute({
    to: "adr_1",
    from: "adr_2",
    file: "tmpl_letter",
    color: true,
    useType: "operational" as const,
    extraService: "certified",
  }, inv.ctx);
  assertEquals(inv.calls[0].headers["idempotency-key"], "inv-42");

  const none = mockCtx([{ body: { id: "c" } }]);
  await letterCreate.execute({
    to: "adr_1",
    from: "adr_2",
    file: "tmpl_letter",
    color: true,
    useType: "operational" as const,
    extraService: "certified",
  }, none.ctx);
  assertEquals("idempotency-key" in none.calls[0].headers, false);
});

Deno.test("letter-create: is declared non-idempotent (it mails a physical piece)", () => {
  assertEquals(letterCreate.idempotent, false);
});

Deno.test("letter-create: a missing use type is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await letterCreate.execute({
        ...{
          to: "adr_1",
          from: "adr_2",
          file: "tmpl_letter",
          color: true,
          useType: "operational" as const,
          extraService: "certified",
        },
        useType: undefined,
      }, ctx),
    Error,
    "Use type is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("letter-create: Lob's validation error is surfaced with its code", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("invalid", "to is invalid", 422) }]);
  await assertRejects(
    async () =>
      await letterCreate.execute({
        to: "adr_1",
        from: "adr_2",
        file: "tmpl_letter",
        color: true,
        useType: "operational" as const,
        extraService: "certified",
      }, ctx),
    Error,
    "invalid",
  );
});

Deno.test("letter-create: a letter without a sender is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await letterCreate.execute({ to: "adr_1", file: "x", useType: "marketing" }, ctx),
    Error,
    "From is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("letter-create: color defaults to false rather than being omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ltr_1" } }]);
  await letterCreate.execute({ to: "adr_1", from: "adr_2", file: "x", useType: "marketing" }, ctx);
  assertEquals(bodyOf(calls[0]).color, false);
});
