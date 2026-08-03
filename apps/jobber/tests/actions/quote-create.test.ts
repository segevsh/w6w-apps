import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/quote-create.ts";

const OK = {
  body: { data: { quoteCreate: { quote: { id: "q1" }, userErrors: [] } } },
};

Deno.test("quote-create: the argument is `attributes`, not `input`", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({
    clientId: "c1",
    propertyId: "p1",
    lineItems: [{ name: "Lawn mowing", quantity: 1, unitPrice: 60 }],
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(sent.query.includes("quoteCreate(attributes: $attributes)"));
  assert(sent.variables.attributes, "variables must carry `attributes`");
  assertEquals(sent.variables.input, undefined);
});

Deno.test("quote-create: never saves an ad-hoc line item into the price book", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({
    clientId: "c1",
    propertyId: "p1",
    lineItems: [{ name: "One-off repair", unitPrice: 250 }],
  }, ctx);
  const items = JSON.parse(calls[0].body!).variables.attributes.lineItems;
  assertEquals(items, [{
    name: "One-off repair",
    unitPrice: 250,
    saveToProductsAndServices: false,
  }]);
});

Deno.test("quote-create: `sendForApproval` becomes Jobber's only legal create transition", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({
    clientId: "c1",
    propertyId: "p1",
    sendForApproval: true,
    lineItems: [{ name: "x" }],
  }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!).variables.attributes.transitionQuoteTo,
    "AWAITING_RESPONSE",
  );
});

Deno.test("quote-create: leaving it a draft sends no transition at all", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ clientId: "c1", propertyId: "p1", lineItems: [{ name: "x" }] }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!).variables.attributes.transitionQuoteTo,
    undefined,
  );
});

Deno.test("quote-create: no usable line item fails locally, without a wasted call", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute({ clientId: "c1", propertyId: "p1", lineItems: [{ quantity: 2 }] }, ctx),
    Error,
    "at least one line item",
  );
  assertEquals(calls.length, 0);
});

Deno.test("quote-create: propertyId is required, because Jobber makes it non-null", () => {
  const p = action.params?.find((x) => x.key === "propertyId");
  assertEquals(p?.required, true);
});

Deno.test("quote-create: userErrors throws", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        quoteCreate: {
          quote: null,
          userErrors: [{ message: "Property must belong to the client", path: ["propertyId"] }],
        },
      },
    },
  }]);
  const err = await assertRejects(
    async () =>
      await action.execute({ clientId: "c1", propertyId: "p9", lineItems: [{ name: "x" }] }, ctx),
    Error,
  );
  assert(err.message.includes("propertyId: Property must belong to the client"));
});
