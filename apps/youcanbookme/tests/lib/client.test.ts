import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { YouCanBookMeClient } from "../../lib/client.ts";

test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new YouCanBookMeClient(ctx);
  const result = await client.request("/acc-1/profiles/prof-1/bookings/book-1", {
    method: "DELETE",
  });
  assertEquals(result, undefined);
});

test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"message":"Resource not found"}' },
  ]);
  const client = new YouCanBookMeClient(ctx);
  const err = await assertRejects(
    () => client.request("/acc-1/profiles/prof-1/bookings/missing"),
    Error,
    "YouCanBookMe 404",
  );
  assertEquals(err.message.includes("/acc-1/profiles/prof-1/bookings/missing"), true);
});

test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const client = new YouCanBookMeClient(ctx);
  await client.request("/acc-1/bookings", {
    query: { search: "kept", other: undefined, blank: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("search"), "kept");
  assertEquals(url.searchParams.has("other"), false);
  assertEquals(url.searchParams.has("blank"), false);
});

test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  const client = new YouCanBookMeClient(ctx);
  await client.request("/acc-1/profiles/prof-1/bookings", {
    method: "POST",
    body: { startsAt: "2026-08-15T14:00:00", endsAt: "2026-08-15T14:30:00" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(
    JSON.parse(calls[0].body!),
    { startsAt: "2026-08-15T14:00:00", endsAt: "2026-08-15T14:30:00" },
  );
});

test("client: never sets Authorization (sign does)", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new YouCanBookMeClient(ctx).request("/acc-1/profiles");
  assertEquals(calls[0].headers["authorization"], undefined);
});

test("client: builds requests against the documented base URL", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new YouCanBookMeClient(ctx).request("/acc-1/profiles");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.youcanbook.me");
  assertEquals(url.pathname, "/v1/acc-1/profiles");
});
