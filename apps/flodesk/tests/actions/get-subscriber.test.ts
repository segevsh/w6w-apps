import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";

import getSubscriber from "../../actions/get-subscriber.ts";

test("get-subscriber: GET /v1/subscribers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "61b2" } }]);
  await getSubscriber.execute({ idOrEmail: "61b2" }, ctx);
  assertEquals(calls[0].url, "https://api.flodesk.com/v1/subscribers/61b2");
});

test("get-subscriber: percent-encodes an email address in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await getSubscriber.execute({ idOrEmail: "ada+news@example.com" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.flodesk.com/v1/subscribers/ada%2Bnews%40example.com",
  );
});

// ---------------------------------------------------------- upsert ----------
