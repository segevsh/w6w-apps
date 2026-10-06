import { assertEquals, assertRejects } from "@std/assert";
import selfMailerCreate from "../../actions/self-mailer-create.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

const addr = {
  name: "Harry Zhang",
  address_line1: "210 King St",
  address_city: "San Francisco",
  address_state: "CA",
  address_zip: "94107",
};

Deno.test("self-mailer-create: POSTs the documented body to /self_mailers", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x_1", url: "https://lob-assets.com/x.pdf" } }]);
  const out = await selfMailerCreate.execute({
    to: "adr_1",
    inside: "<html>in</html>",
    outside: "<html>out</html>",
    useType: "marketing" as const,
    size: "11x9_bifold",
  }, ctx) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/self_mailers");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    to: "adr_1",
    use_type: "marketing",
    inside: "<html>in</html>",
    outside: "<html>out</html>",
    size: "11x9_bifold",
  });
  assertEquals(out.id, "x_1");
});

Deno.test("self-mailer-create: a saved address id passes through as a string, an inline address as an object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x_2" } }]);
  await selfMailerCreate.execute({
    ...{
      to: "adr_1",
      inside: "<html>in</html>",
      outside: "<html>out</html>",
      useType: "marketing" as const,
      size: "11x9_bifold",
    },
    to: "adr_123",
  }, ctx);
  assertEquals(bodyOf(calls[0]).to, "adr_123");
  const second = mockCtx([{ body: { id: "x_3" } }]);
  await selfMailerCreate.execute({
    ...{
      to: "adr_1",
      inside: "<html>in</html>",
      outside: "<html>out</html>",
      useType: "marketing" as const,
      size: "11x9_bifold",
    },
    to: JSON.stringify(addr),
  }, second.ctx);
  assertEquals(bodyOf(second.calls[0]).to, addr);
});

Deno.test("self-mailer-create: Idempotency-Key is the caller's own, else the invocation id, else absent", async () => {
  const own = mockCtx([{ body: { id: "a" } }]);
  await selfMailerCreate.execute({
    ...{
      to: "adr_1",
      inside: "<html>in</html>",
      outside: "<html>out</html>",
      useType: "marketing" as const,
      size: "11x9_bifold",
    },
    idempotencyKey: "my-key",
  }, own.ctx);
  assertEquals(own.calls[0].headers["idempotency-key"], "my-key");

  const inv = mockCtx([{ body: { id: "b" } }]);
  (inv.ctx as { invocation?: unknown }).invocation = { invocationId: "inv-42" };
  await selfMailerCreate.execute({
    to: "adr_1",
    inside: "<html>in</html>",
    outside: "<html>out</html>",
    useType: "marketing" as const,
    size: "11x9_bifold",
  }, inv.ctx);
  assertEquals(inv.calls[0].headers["idempotency-key"], "inv-42");

  const none = mockCtx([{ body: { id: "c" } }]);
  await selfMailerCreate.execute({
    to: "adr_1",
    inside: "<html>in</html>",
    outside: "<html>out</html>",
    useType: "marketing" as const,
    size: "11x9_bifold",
  }, none.ctx);
  assertEquals("idempotency-key" in none.calls[0].headers, false);
});

Deno.test("self-mailer-create: is declared non-idempotent (it mails a physical piece)", () => {
  assertEquals(selfMailerCreate.idempotent, false);
});

Deno.test("self-mailer-create: a missing use type is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await selfMailerCreate.execute({
        ...{
          to: "adr_1",
          inside: "<html>in</html>",
          outside: "<html>out</html>",
          useType: "marketing" as const,
          size: "11x9_bifold",
        },
        useType: undefined,
      }, ctx),
    Error,
    "Use type is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("self-mailer-create: Lob's validation error is surfaced with its code", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("invalid", "to is invalid", 422) }]);
  await assertRejects(
    async () =>
      await selfMailerCreate.execute({
        to: "adr_1",
        inside: "<html>in</html>",
        outside: "<html>out</html>",
        useType: "marketing" as const,
        size: "11x9_bifold",
      }, ctx),
    Error,
    "invalid",
  );
});
