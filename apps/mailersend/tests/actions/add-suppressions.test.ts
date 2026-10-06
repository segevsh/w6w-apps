import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/add-suppressions.ts";
import { bodyOf, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("add-suppressions: blocklist takes recipients and patterns, domain optional", async () => {
  const resp = { data: [{ id: "s1", type: "exact", pattern: "a@x.com" }] };
  const { ctx, calls } = mockCtx([{ status: 201, body: resp }]);
  const out = await exec(action, {
    type: "blocklist",
    recipients: ["a@x.com"],
    patterns: [".*@spam.example"],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/suppressions/blocklist");
  assertEquals(bodyOf(calls[0]), { recipients: ["a@x.com"], patterns: [".*@spam.example"] });
  assertEquals(out, resp);
});

Deno.test("add-suppressions: hard-bounces need a domain and accept comma-separated recipients", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: [] } }]);
  await exec(action, { type: "hard-bounces", domainId: "d1", recipients: "a@x.com, b@x.com" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/suppressions/hard-bounces");
  assertEquals(bodyOf(calls[0]), { domain_id: "d1", recipients: ["a@x.com", "b@x.com"] });
});

Deno.test("add-suppressions: refuses bad combinations before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        exec(action, { type: "unsubscribes", recipients: ["a@x.com"] }, ctx)
      ),
    Error,
    "domainId is required",
  );
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        exec(action, { type: "spam-complaints", domainId: "d", patterns: ["x"] }, ctx)
      ),
    Error,
    "patterns are only",
  );
  await assertRejects(
    () => Promise.resolve().then(() => exec(action, { type: "blocklist" }, ctx)),
    Error,
    "recipients or patterns",
  );
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        exec(action, { type: "on-hold-list", domainId: "d", recipients: ["a@x.com"] }, ctx)
      ),
    Error,
    "cannot add",
  );
  assertEquals(calls.length, 0);
});
