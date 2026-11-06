import assert from "node:assert/strict";
import { test } from "node:test";
import { orderedRequest, orderValue } from "../lib/ordered-json.ts";
import { reference } from "./_contract.ts";
import { reverseKeys } from "./_helpers.ts";

for (const [name, expected] of Object.entries(reference)) {
  test(`${name}: all object keys follow the official reference, including authentication`, () => {
    assert.equal(orderedRequest(name, reverseKeys(expected[name])), JSON.stringify(expected));
  });
}

test("nested arrays preserve item order, inherited address fields, zero and false", () => {
  const expected = {
    transactionType: "authCaptureTransaction",
    amount: "10.00",
    payment: {
      creditCard: { cardNumber: "4111111111111111", expirationDate: "2030-12", cardCode: "123" },
    },
    lineItems: {
      lineItem: [
        { itemId: "second-id-first", name: "Free", quantity: 1, unitPrice: 0, taxable: false },
        { itemId: "first-id-second", name: "Paid", quantity: 2, unitPrice: "5.00", taxable: true },
      ],
    },
    taxExempt: false,
    billTo: {
      firstName: "Jane",
      lastName: "Doe",
      address: "Main St",
      city: "Seattle",
      country: "US",
      phoneNumber: "5551234567",
      faxNumber: "",
    },
    transactionSettings: { setting: [{ settingName: "emailCustomer", settingValue: "false" }] },
  };
  assert.equal(
    JSON.stringify(orderValue("transactionRequestType", reverseKeys(expected))),
    JSON.stringify(expected),
  );
});

test("payment profile arrays and inherited customer fields are recursively ordered", () => {
  const expected = {
    merchantCustomerId: "customer-1",
    description: "",
    email: "test@example.com",
    paymentProfiles: [
      {
        customerType: "individual",
        billTo: { firstName: "Jane", country: "US" },
        payment: {
          bankAccount: {
            accountType: "checking",
            routingNumber: "125000024",
            accountNumber: "123456789",
            nameOnAccount: "Jane Doe",
            echeckType: "WEB",
          },
        },
        defaultPaymentProfile: false,
      },
      {
        customerType: "individual",
        payment: {
          opaqueData: { dataDescriptor: "COMMON.ACCEPT.INAPP.PAYMENT", dataValue: "test-token" },
        },
        defaultPaymentProfile: true,
      },
    ],
    shipToList: [{ firstName: "Jane", lastName: "Doe", city: "Seattle", country: "US" }],
  };
  assert.equal(
    JSON.stringify(orderValue("customerProfileType", reverseKeys(expected))),
    JSON.stringify(expected),
  );
});

test("JSON-encoded setting values and exact decimal strings are not reordered or rounded", () => {
  const value = {
    setting: [{ settingValue: '{"z":1,"a":2}', settingName: "hostedPaymentStyleOptions" }],
  };
  assert.deepEqual(orderValue("ArrayOfSetting", value), {
    setting: [{ settingName: "hostedPaymentStyleOptions", settingValue: '{"z":1,"a":2}' }],
  });
  assert.deepEqual(
    orderValue("transactionRequestType", {
      amount: "99999999999.1234",
      transactionType: "authCaptureTransaction",
    }),
    { transactionType: "authCaptureTransaction", amount: "99999999999.1234" },
  );
});

test("reject unknown fields instead of placing them in an arbitrary position", () => {
  assert.throws(
    () =>
      orderedRequest("createTransactionRequest", {
        transactionRequest: {
          transactionType: "authCaptureTransaction",
          payment: { creditCard: { typo: "do not silently drop" } },
        },
      }),
    /unsupported field .*creditCard.typo/,
  );
  assert.throws(() => orderedRequest("unknownRequest", {}), /unsupported request/);
});

test("reject conflicting payment choices, arrays in scalar objects and invalid scalar types", () => {
  assert.throws(
    () => orderValue("paymentType", { creditCard: {}, bankAccount: {} }),
    /only one of/,
  );
  assert.throws(() => orderValue("transactionRequestType", { payment: [] }), /not an array/);
  assert.throws(
    () => orderValue("transactionRequestType", { taxExempt: "maybe" }),
    /must be boolean/,
  );
  assert.throws(() => orderValue("transactionRequestType", { amount: null }), /must be decimal/);
  assert.throws(
    () => orderValue("transactionRequestType", { amount: Number.NaN }),
    /must be decimal/,
  );
  assert.throws(() => orderValue("transactionRequestType", { amount: {} }), /must be decimal/);
});
