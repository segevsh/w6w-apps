import { assert, assertEquals, assertRejects } from "@std/assert";
import contractCreate from "../../actions/contract-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contract-create: calls POST /api/contracts with the documented body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: "queued", data: { contract: { id: "c1", signers: [{ id: "s1" }] } } },
  }]);
  const out = await contractCreate.execute(
    {
      templateId: "t1",
      signers: [{ name: "Sam", email: "s@x.com" }],
      test: true,
      labels: "MA, Rental",
      expiresInHours: 48,
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/contracts");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    template_id: "t1",
    signers: [{ name: "Sam", email: "s@x.com" }],
    test: "yes",
    labels: ["MA", "Rental"],
    expires_in_hours: "48",
  });
  assert(
    out.status === "queued" && (out.contract as { id: string }).id === "c1",
    JSON.stringify(out),
  );
});

Deno.test("contract-create: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        contractCreate.execute(
          {
            templateId: "t1",
            signers: [{ name: "Sam", email: "s@x.com" }],
            test: true,
            labels: "MA, Rental",
            expiresInHours: 48,
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(
    err.message.includes("forbidden") && err.message.includes("Invalid or missing"),
    err.message,
  );
});

Deno.test("contract-create: signers given as a JSON string are parsed; bad JSON throws", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "queued", data: { contract: { id: "c" } } } }]);
  await contractCreate.execute(
    { templateId: "t1", signers: '[{"name":"A","email":"a@x.com"}]' } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).signers, [{ name: "A", email: "a@x.com" }]);
  await assertRejects(
    () => Promise.resolve(contractCreate.execute({ templateId: "t", signers: "{" } as never, ctx)),
    Error,
    "signers is not valid JSON",
  );
});

Deno.test("contract-create: test and saveAsDraft are omitted unless set", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "queued", data: { contract: {} } } }]);
  await contractCreate.execute({ templateId: "t1", signers: [] } as never, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals("test" in sent, false);
  assertEquals("save_as_draft" in sent, false);
});
