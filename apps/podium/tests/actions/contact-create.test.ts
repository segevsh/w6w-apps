import { assertEquals, assertRejects } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import contactCreate from "../../actions/contact-create.ts";

Deno.test("contact-create: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactCreate.execute(
    {
      "name": "name-1",
      "locations": "a1, b2",
      "email": "ann@example.com",
      "phoneNumber": "+15555550123",
      "tags": "a1, b2",
      "address": { "addressLine1": "1 Main St" },
      "attributes": [{ "uid": "at-1", "value": "x" }],
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/contacts");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "name": "name-1",
    "locations": ["a1", "b2"],
    "email": "ann@example.com",
    "phoneNumber": "+15555550123",
    "tags": ["a1", "b2"],
    "address": { "addressLine1": "1 Main St" },
    "attributes": [{ "uid": "at-1", "value": "x" }],
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("contact-create: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactCreate.execute(
    { "name": "name-1", "locations": "a1, b2" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/contacts");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), { "name": "name-1", "locations": ["a1", "b2"] });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("contact-create: declares its params and kind", () => {
  assertEquals((contactCreate.params ?? []).map((p) => p.key), [
    "name",
    "locations",
    "email",
    "phoneNumber",
    "tags",
    "address",
    "attributes",
  ]);
  assertEquals((contactCreate.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "name",
    "locations",
  ]);
  assertEquals(contactCreate.type, "perform");
  assertEquals(contactCreate.idempotent, true);
});

Deno.test("contact-create: a malformed JSON param fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await contactCreate.execute(
        { "name": "name-1", "locations": "a1, b2", "address": "{not json" } as never,
        ctx,
      ),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});
