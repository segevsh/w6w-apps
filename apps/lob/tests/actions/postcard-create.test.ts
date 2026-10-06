import { assertEquals, assertRejects } from "@std/assert";
import postcardCreate from "../../actions/postcard-create.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

const addr = {
  name: "Harry Zhang",
  address_line1: "210 King St",
  address_city: "San Francisco",
  address_state: "CA",
  address_zip: "94107",
};

Deno.test("postcard-create: POSTs the documented body to /postcards", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x_1", url: "https://lob-assets.com/x.pdf" } }]);
  const out = await postcardCreate.execute({
    to: "adr_1",
    front: "<html>front</html>",
    back: "tmpl_back",
    useType: "marketing" as const,
    size: "6x9",
  }, ctx) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/postcards");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    to: "adr_1",
    use_type: "marketing",
    front: "<html>front</html>",
    back: "tmpl_back",
    size: "6x9",
  });
  assertEquals(out.id, "x_1");
});

Deno.test("postcard-create: a saved address id passes through as a string, an inline address as an object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x_2" } }]);
  await postcardCreate.execute({
    ...{
      to: "adr_1",
      front: "<html>front</html>",
      back: "tmpl_back",
      useType: "marketing" as const,
      size: "6x9",
    },
    to: "adr_123",
  }, ctx);
  assertEquals(bodyOf(calls[0]).to, "adr_123");
  const second = mockCtx([{ body: { id: "x_3" } }]);
  await postcardCreate.execute({
    ...{
      to: "adr_1",
      front: "<html>front</html>",
      back: "tmpl_back",
      useType: "marketing" as const,
      size: "6x9",
    },
    to: JSON.stringify(addr),
  }, second.ctx);
  assertEquals(bodyOf(second.calls[0]).to, addr);
});

Deno.test("postcard-create: Idempotency-Key is the caller's own, else the invocation id, else absent", async () => {
  const own = mockCtx([{ body: { id: "a" } }]);
  await postcardCreate.execute({
    ...{
      to: "adr_1",
      front: "<html>front</html>",
      back: "tmpl_back",
      useType: "marketing" as const,
      size: "6x9",
    },
    idempotencyKey: "my-key",
  }, own.ctx);
  assertEquals(own.calls[0].headers["idempotency-key"], "my-key");

  const inv = mockCtx([{ body: { id: "b" } }]);
  (inv.ctx as { invocation?: unknown }).invocation = { invocationId: "inv-42" };
  await postcardCreate.execute({
    to: "adr_1",
    front: "<html>front</html>",
    back: "tmpl_back",
    useType: "marketing" as const,
    size: "6x9",
  }, inv.ctx);
  assertEquals(inv.calls[0].headers["idempotency-key"], "inv-42");

  const none = mockCtx([{ body: { id: "c" } }]);
  await postcardCreate.execute({
    to: "adr_1",
    front: "<html>front</html>",
    back: "tmpl_back",
    useType: "marketing" as const,
    size: "6x9",
  }, none.ctx);
  assertEquals("idempotency-key" in none.calls[0].headers, false);
});

Deno.test("postcard-create: is declared non-idempotent (it mails a physical piece)", () => {
  assertEquals(postcardCreate.idempotent, false);
});

Deno.test("postcard-create: a missing use type is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await postcardCreate.execute({
        ...{
          to: "adr_1",
          front: "<html>front</html>",
          back: "tmpl_back",
          useType: "marketing" as const,
          size: "6x9",
        },
        useType: undefined,
      }, ctx),
    Error,
    "Use type is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("postcard-create: Lob's validation error is surfaced with its code", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("invalid", "to is invalid", 422) }]);
  await assertRejects(
    async () =>
      await postcardCreate.execute({
        to: "adr_1",
        front: "<html>front</html>",
        back: "tmpl_back",
        useType: "marketing" as const,
        size: "6x9",
      }, ctx),
    Error,
    "invalid",
  );
});

Deno.test("postcard-create: a QR code object is forwarded as qr_code", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "psc_1" } }]);
  await postcardCreate.execute({
    to: "adr_1",
    front: "f",
    back: "b",
    useType: "marketing",
    qrCode: '{"position":"relative","redirect_url":"https://x.test","width":"1"}',
  }, ctx);
  assertEquals(
    (bodyOf(calls[0]).qr_code as { redirect_url: string }).redirect_url,
    "https://x.test",
  );
});
