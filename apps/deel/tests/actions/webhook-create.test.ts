import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-create.ts";

const display = {};

Deno.test("webhook-create: posts name, url and events", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: {} } }], { display });
  await action.execute!({
    name: "contract events",
    url: "https://example.com/hook",
    events: "contract.created, time_off.created",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      name: "contract events",
      url: "https://example.com/hook",
      events: ["contract.created", "time_off.created"],
    },
  });
});

/** Deel refuses plain HTTP; failing here says why. */
Deno.test("webhook-create: a non-https URL is refused locally", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ name: "x", url: "http://example.com", events: "a" }, ctx),
    Error,
    "must be https",
  );
  assertEquals(calls.length, 0);
});

Deno.test("webhook-create: name, url and at least one event are required", async () => {
  for (
    const patch of [
      { url: "https://e.com", events: "a" },
      { name: "n", events: "a" },
      { name: "n", url: "https://e.com" },
    ]
  ) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(async () => await action.execute!(patch, ctx), Error);
    assertEquals(calls.length, 0);
  }
});
