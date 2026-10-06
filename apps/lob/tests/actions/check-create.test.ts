import { assertEquals, assertRejects } from "@std/assert";
import checkCreate from "../../actions/check-create.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

const addr = {
  name: "Harry Zhang",
  address_line1: "210 King St",
  address_city: "San Francisco",
  address_state: "CA",
  address_zip: "94107",
};

Deno.test("check-create: POSTs the documented body to /checks", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x_1", url: "https://lob-assets.com/x.pdf" } }]);
  const out = await checkCreate.execute({
    to: "adr_1",
    from: "adr_2",
    bankAccount: "bank_1",
    amount: 12.5,
    message: "Thanks",
    useType: "operational" as const,
    memo: "Invoice 7",
  }, ctx) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/checks");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    to: "adr_1",
    from: "adr_2",
    use_type: "operational",
    bank_account: "bank_1",
    amount: 12.5,
    message: "Thanks",
    memo: "Invoice 7",
  });
  assertEquals(out.id, "x_1");
});

Deno.test("check-create: a saved address id passes through as a string, an inline address as an object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x_2" } }]);
  await checkCreate.execute({
    ...{
      to: "adr_1",
      from: "adr_2",
      bankAccount: "bank_1",
      amount: 12.5,
      message: "Thanks",
      useType: "operational" as const,
      memo: "Invoice 7",
    },
    to: "adr_123",
  }, ctx);
  assertEquals(bodyOf(calls[0]).to, "adr_123");
  const second = mockCtx([{ body: { id: "x_3" } }]);
  await checkCreate.execute({
    ...{
      to: "adr_1",
      from: "adr_2",
      bankAccount: "bank_1",
      amount: 12.5,
      message: "Thanks",
      useType: "operational" as const,
      memo: "Invoice 7",
    },
    to: JSON.stringify(addr),
  }, second.ctx);
  assertEquals(bodyOf(second.calls[0]).to, addr);
});

Deno.test("check-create: Idempotency-Key is the caller's own, else the invocation id, else absent", async () => {
  const own = mockCtx([{ body: { id: "a" } }]);
  await checkCreate.execute({
    ...{
      to: "adr_1",
      from: "adr_2",
      bankAccount: "bank_1",
      amount: 12.5,
      message: "Thanks",
      useType: "operational" as const,
      memo: "Invoice 7",
    },
    idempotencyKey: "my-key",
  }, own.ctx);
  assertEquals(own.calls[0].headers["idempotency-key"], "my-key");

  const inv = mockCtx([{ body: { id: "b" } }]);
  (inv.ctx as { invocation?: unknown }).invocation = { invocationId: "inv-42" };
  await checkCreate.execute({
    to: "adr_1",
    from: "adr_2",
    bankAccount: "bank_1",
    amount: 12.5,
    message: "Thanks",
    useType: "operational" as const,
    memo: "Invoice 7",
  }, inv.ctx);
  assertEquals(inv.calls[0].headers["idempotency-key"], "inv-42");

  const none = mockCtx([{ body: { id: "c" } }]);
  await checkCreate.execute({
    to: "adr_1",
    from: "adr_2",
    bankAccount: "bank_1",
    amount: 12.5,
    message: "Thanks",
    useType: "operational" as const,
    memo: "Invoice 7",
  }, none.ctx);
  assertEquals("idempotency-key" in none.calls[0].headers, false);
});

Deno.test("check-create: is declared non-idempotent (it mails a physical piece)", () => {
  assertEquals(checkCreate.idempotent, false);
});

Deno.test("check-create: a missing use type is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await checkCreate.execute({
        ...{
          to: "adr_1",
          from: "adr_2",
          bankAccount: "bank_1",
          amount: 12.5,
          message: "Thanks",
          useType: "operational" as const,
          memo: "Invoice 7",
        },
        useType: undefined,
      }, ctx),
    Error,
    "Use type is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("check-create: Lob's validation error is surfaced with its code", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("invalid", "to is invalid", 422) }]);
  await assertRejects(
    async () =>
      await checkCreate.execute({
        to: "adr_1",
        from: "adr_2",
        bankAccount: "bank_1",
        amount: 12.5,
        message: "Thanks",
        useType: "operational" as const,
        memo: "Invoice 7",
      }, ctx),
    Error,
    "invalid",
  );
});

Deno.test("check-create: refuses a check with neither message nor check bottom", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await checkCreate.execute({
        to: "adr_1",
        from: "adr_2",
        bankAccount: "b",
        amount: 1,
        useType: "marketing",
      }, ctx),
    Error,
    "message or a check bottom",
  );
  assertEquals(calls.length, 0);
});

Deno.test("check-create: refuses a missing sender and a non-positive amount", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () =>
      await checkCreate.execute({
        to: "adr_1",
        bankAccount: "b",
        amount: 1,
        message: "m",
        useType: "marketing",
      }, ctx),
    Error,
    "From is required",
  );
  await assertRejects(
    async () =>
      await checkCreate.execute({
        to: "adr_1",
        from: "adr_2",
        bankAccount: "b",
        amount: 0,
        message: "m",
        useType: "marketing",
      }, ctx),
    Error,
    "greater than zero",
  );
});

Deno.test("check-create: a check bottom replaces the message, and no mail_type is ever sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "chk_1" } }]);
  await checkCreate.execute({
    to: "adr_1",
    from: "adr_2",
    bankAccount: "bank_1",
    amount: 5,
    checkBottom: "tmpl_cb",
    useType: "marketing",
    mailType: "usps_standard",
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.check_bottom, "tmpl_cb");
  assertEquals("message" in body, false);
  assertEquals("mail_type" in body, false);
});
