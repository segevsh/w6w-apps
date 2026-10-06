import { assert, assertEquals, assertRejects } from "@std/assert";
import signerAdd from "../../actions/signer-add.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("signer-add: calls POST /api/contracts/c1/signers with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  const out = await signerAdd.execute(
    {
      contractId: "c1",
      name: "Sam",
      email: "s@x.com",
      signatureRequestDeliveryMethods: "email,sms",
      companyName: "ACME",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/contracts/c1/signers");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Sam",
    email: "s@x.com",
    company_name: "ACME",
    signature_request_delivery_methods: ["email", "sms"],
  });
  assert(out.status === "success", JSON.stringify(out));
});

Deno.test("signer-add: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        signerAdd.execute(
          {
            contractId: "c1",
            name: "Sam",
            email: "s@x.com",
            signatureRequestDeliveryMethods: "email,sms",
            companyName: "ACME",
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

Deno.test("signer-add: a slash pasted into an id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await signerAdd.execute(
    {
      ...({
        contractId: "c1",
        name: "Sam",
        email: "s@x.com",
        signatureRequestDeliveryMethods: "email,sms",
        companyName: "ACME",
      }),
      contractId: "a/../b",
    } as never,
    ctx,
  );
  assert(!pathOf(calls[0].url).includes("/../"), calls[0].url);
});

Deno.test("signer-add: an empty delivery selection is omitted, never sent as []", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await signerAdd.execute(
    { contractId: "c1", name: "A", signatureRequestDeliveryMethods: [] } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { name: "A" });
});
