import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-webhook.ts";
import { bodyOf, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-webhook: POSTs /v1/webhooks with wire names and coerces version to a number", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { data: { id: "w1", name: "hook", signing_secret: "abc" } },
  }]);
  const out = await exec(action, {
    domainId: "d1",
    name: "hook",
    url: "https://x.test/h",
    events: ["activity.sent", "activity.delivered"],
    enabled: true,
    version: "2" as unknown as number,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
  assertEquals(bodyOf(calls[0]), {
    domain_id: "d1",
    name: "hook",
    url: "https://x.test/h",
    events: ["activity.sent", "activity.delivered"],
    enabled: true,
    version: 2,
  });
  assertEquals(out, { data: { id: "w1", name: "hook" } }, "the signing secret never leaves");
});

Deno.test("create-webhook: events may be a comma-separated string; none is refused", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: {} } }]);
  await exec(action, {
    domainId: "d",
    name: "n",
    url: "https://x.test",
    events: "activity.sent, activity.opened",
  }, ctx);
  assertEquals(bodyOf(calls[0]).events, ["activity.sent", "activity.opened"]);
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        exec(action, { domainId: "d", name: "n", url: "u", events: [] }, ctx)
      ),
    Error,
    "at least one event",
  );
});

Deno.test("create-webhook: the test-ping failure message is surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      message: "The given data was invalid.",
      errors: { url: ["The url must return a 2xx response."] },
    },
  }]);
  await assertRejects(
    () =>
      exec(action, {
        domainId: "d",
        name: "n",
        url: "https://x.test",
        events: ["activity.sent"],
      }, ctx),
    Error,
    "url: The url must return",
  );
});

Deno.test("create-webhook: offers every event the docs list", () => {
  const options = action.params!.find((p) => p.key === "events")!.options as { value: string }[];
  assertEquals(options.length, 24);
});
