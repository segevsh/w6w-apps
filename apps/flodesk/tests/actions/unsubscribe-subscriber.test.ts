import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";

import unsubscribeSubscriber from "../../actions/unsubscribe-subscriber.ts";

Deno.test("unsubscribe-subscriber: POSTs the unsubscribe path with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "61b2", status: "unsubscribed" } }]);
  await unsubscribeSubscriber.execute({ idOrEmail: "ada@example.com" }, ctx);

  assertEquals(
    calls[0].url,
    "https://api.flodesk.com/v1/subscribers/ada%40example.com/unsubscribe",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
});

Deno.test("unsubscribe-subscriber: propagates a 404 for an unknown subscriber", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { code: "not_found" } }]);
  const err = await assertRejects(
    () => unsubscribeSubscriber.execute({ idOrEmail: "nope" }, ctx) as Promise<unknown>,
    Error,
  );
  assert(err.message.includes("404"));
});
