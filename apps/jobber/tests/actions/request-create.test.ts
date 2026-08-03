import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/request-create.ts";

Deno.test("request-create: requires only a client, and splits formIds on commas", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { requestCreate: { request: { id: "r1" }, userErrors: [] } } },
  }]);
  await action.execute({ clientId: "c1", title: "Leaky tap", formIds: "f1, f2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input, {
    clientId: "c1",
    title: "Leaky tap",
    formIds: ["f1", "f2"],
  });
});

Deno.test("request-create: never claims an inbound `source`", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { requestCreate: { request: { id: "r1" }, userErrors: [] } } },
  }]);
  await action.execute({ clientId: "c1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input.source, undefined);
  assertEquals(action.params?.some((p) => p.key === "source"), false);
});

Deno.test("request-create: userErrors throws", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: { requestCreate: { request: null, userErrors: [{ message: "Client not found" }] } },
    },
  }]);
  await assertRejects(
    async () => await action.execute({ clientId: "nope" }, ctx),
    Error,
    "Client not found",
  );
});
