import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-pin-release.ts";

const UUID = "a".repeat(32);
const device = (pin: number | null = null) => ({
  status: 200,
  body: {
    d: [{
      id: 5,
      belongs_to__application: { __id: 1 },
      is_pinned_on__release: pin === null ? null : { __id: pin },
    }],
  },
});
const release = (extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    d: [{
      id: 900,
      commit: "abc123",
      status: "success",
      is_invalidated: false,
      belongs_to__application: { __id: 1 },
      ...extra,
    }],
  },
});
const ok = { status: 200, body: {} };

/** The canary pattern. */
Deno.test("device-pin-release: pins by commit and reports what changed", async () => {
  const { ctx, calls } = mockCtx([device(), release(), ok]);
  const result = await action.execute({ uuid: UUID, release: "abc123" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[2].method, "PATCH");
  assertEquals(JSON.parse(calls[2].body!), { is_pinned_on__release: 900 });
  assertEquals(result.pinned, true);
  assertEquals(result.commit, "abc123");
});

/** Unpinning means "follow the fleet", not "go back". */
Deno.test("device-pin-release: an empty release unpins and says what that means", async () => {
  const { ctx, calls, logs } = mockCtx([device(900), ok]);
  const result = await action.execute({ uuid: UUID }, ctx) as Record<string, unknown>;
  assertEquals(JSON.parse(calls[1].body!), { is_pinned_on__release: null });
  assertEquals(result.pinned, false);
  assertEquals(result.willFollowFleetTarget, true);
  assertEquals(result.previousPinId, 900);
  assert(
    logs.some((l) => /not necessarily the release it is running/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** balena's own refusal names the release rather than the mismatch. */
Deno.test("device-pin-release: refuses a release from another fleet", async () => {
  const { ctx, calls } = mockCtx([
    device(),
    release({ belongs_to__application: { __id: 2 } }),
  ]);
  const err = await assertRejects(
    async () => await action.execute({ uuid: UUID, release: "abc123" }, ctx),
    Error,
  );
  assert(/different fleet/.test(err.message), err.message);
  assertEquals(calls.length, 2, "it must not patch before refusing");
});

/** Pinning to a failed build leaves the device with nothing to download. */
Deno.test("device-pin-release: refuses a release that did not build", async () => {
  const { ctx } = mockCtx([device(), release({ status: "failed" })]);
  const err = await assertRejects(
    async () => await action.execute({ uuid: UUID, release: "abc123" }, ctx),
    Error,
  );
  assert(/nothing to download/.test(err.message), err.message);
});

/** balena allows it; the app says so. */
Deno.test("device-pin-release: warns when pinning to an invalidated release", async () => {
  const { ctx, logs } = mockCtx([device(), release({ is_invalidated: true }), ok]);
  const result = await action.execute({ uuid: UUID, release: "abc123" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.releaseInvalidated, true);
  assert(
    logs.some((l) => l.level === "warn" && /INVALIDATED/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("device-pin-release: an unknown release names all three ways to refer to one", async () => {
  const { ctx } = mockCtx([device(), { status: 200, body: { d: [] } }]);
  const err = await assertRejects(
    async () => await action.execute({ uuid: UUID, release: "nope" }, ctx),
    Error,
  );
  assert(/full commit hash, a version/.test(err.message), err.message);
});

Deno.test("device-pin-release: a numeric reference filters on the release id", async () => {
  const { ctx, calls } = mockCtx([device(), release(), ok]);
  await action.execute({ uuid: UUID, release: "900" }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("$filter"), "id eq 900");
});
