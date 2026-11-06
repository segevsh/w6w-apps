import assert from "node:assert/strict";
import { test } from "node:test";
import { AuthorizeNetClient, AuthorizeNetError, ENDPOINTS, readResponse } from "../lib/client.ts";
import charge from "../actions/charge-payment.ts";
import capture from "../actions/capture-payment.ts";
import refund from "../actions/refund-payment.ts";
import { mockCtx, OK } from "./_helpers.ts";

const response = (body: unknown, status = 200) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status });

test("BOM-prefixed JSON is accepted; HTTP errors and malformed bodies are rejected without echoing raw data", async () => {
  assert.deepEqual(await readResponse(response("\uFEFF" + JSON.stringify(OK))), OK);
  for (const body of ["<html>private gateway error</html>", "", "null", "[]"]) {
    await assert.rejects(
      () => readResponse(response(body)),
      (e: Error) => !e.message.includes("private gateway"),
    );
  }
  await assert.rejects(() => readResponse(response(OK, 503)), /HTTP 503/);
  await assert.rejects(() => readResponse(response({})), /request failed/);
});

test("HTTP 200 gateway errors and declined transactions fail; held-for-review remains distinguishable", async () => {
  await assert.rejects(
    () =>
      readResponse(
        response({
          messages: {
            resultCode: "Error",
            message: [{ code: "E00003", text: "private card number" }],
          },
        }),
      ),
    (e: Error) => e.message.includes("E00003") && !e.message.includes("private"),
  );
  for (const responseCode of ["2", "3"]) {
    await assert.rejects(
      () =>
        readResponse(
          response({
            ...OK,
            transactionResponse: {
              responseCode,
              transId: "123",
              errors: [{ errorCode: "65", errorText: "private data" }],
            },
          }),
        ),
      (e: Error) =>
        e instanceof AuthorizeNetError && e.transactionId === "123" && e.codes[0] === "65" &&
        !e.message.includes("private"),
    );
  }
  const held = { ...OK, transactionResponse: { responseCode: "4", transId: "review-1" } };
  assert.deepEqual(await readResponse(response(held)), held);
});

test("production routing and no retry on errors", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 429, body: { messages: { resultCode: "Error" } } }],
    "production",
  );
  await assert.rejects(() => new AuthorizeNetClient(ctx).request("getMerchantDetailsRequest", {}));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, ENDPOINTS.production);
});

test("actions cannot supply authentication or override a payment operation", async () => {
  const { ctx, calls } = mockCtx();
  await assert.rejects(
    () =>
      new AuthorizeNetClient(ctx).request("getMerchantDetailsRequest", {
        merchantAuthentication: {},
      }),
    /connection/,
  );
  await assert.rejects(
    async () =>
      await charge.execute({
        amount: "1.00",
        payment: { opaqueData: { dataDescriptor: "COMMON.ACCEPT.INAPP.PAYMENT", dataValue: "x" } },
        additionalFields: { transactionType: "voidTransaction" },
      }, ctx),
    /cannot be overridden/,
  );
  assert.equal(calls.length, 0);
});

test("saved-profile charge orders nested profile references and optional order fields", async () => {
  const { ctx, calls } = mockCtx();
  await charge.execute({
    amount: "10.50",
    profile: {
      paymentProfile: { cardCode: "123", paymentProfileId: "456" },
      customerProfileId: "123",
    },
    additionalFields: { order: { description: "Order", invoiceNumber: "INV-1" } },
  }, ctx);
  const tx = JSON.parse(calls[0].body as string).createTransactionRequest.transactionRequest;
  assert.equal(
    JSON.stringify(tx),
    '{"transactionType":"authCaptureTransaction","amount":"10.50","profile":{"customerProfileId":"123","paymentProfile":{"paymentProfileId":"456","cardCode":"123"}},"order":{"invoiceNumber":"INV-1","description":"Order"}}',
  );
});

test("payment validation rejects missing or conflicting payment sources and missing refund details", async () => {
  const { ctx, calls } = mockCtx();
  for (
    const input of [{ amount: "1" }, { amount: "1", payment: {}, profile: {} }, { payment: {} }, {
      amount: "-1",
      payment: {},
    }]
  ) {
    await assert.rejects(async () => await charge.execute(input, ctx));
  }
  await assert.rejects(
    async () => await refund.execute({ amount: "1.00", refTransId: "123" }, ctx),
    /payment details/i,
  );
  await assert.rejects(async () => await capture.execute({}, ctx), /required/);
  assert.equal(calls.length, 0);
});

test("a declined HTTP-200 response retains transaction diagnostics even when the API resultCode is Error", async () => {
  await assert.rejects(() =>
    readResponse(response({
      messages: {
        resultCode: "Error",
        message: [{ code: "E00027", text: "The transaction was unsuccessful." }],
      },
      transactionResponse: {
        responseCode: "2",
        transId: "declined-123",
        errors: [{ errorCode: "65", errorText: "Private processor response" }],
      },
    })), (error: Error) =>
    error instanceof AuthorizeNetError &&
    error.transactionId === "declined-123" && error.codes.includes("65") &&
    error.codes.includes("E00027") &&
    error.message.includes("declined") && !error.message.includes("Private"));
});
