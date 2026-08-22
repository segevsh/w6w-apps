import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/fleet-get.ts";

const fleet = {
  status: 200,
  body: {
    d: [{
      id: 1,
      app_name: "sensors",
      slug: "acme/sensors",
      is_archived: false,
      should_track_latest_release: true,
      should_be_running__release: { __id: 900 },
    }],
  },
};

const devices = {
  status: 200,
  body: {
    d: [
      { is_online: true, is_running__release: { __id: 900 }, is_pinned_on__release: null },
      { is_online: true, is_running__release: { __id: 800 }, is_pinned_on__release: { __id: 800 } },
      { is_online: false, is_running__release: { __id: 800 }, is_pinned_on__release: null },
    ],
  },
};

/** The three reasons a device is not running the new build. */
Deno.test("fleet-get: counts online, pinned and off-target devices", async () => {
  const { ctx, calls } = mockCtx([fleet, devices]);
  const result = await action.execute({ fleet: "acme/sensors" }, ctx) as Record<string, unknown>;

  assert(new URL(calls[0].url).searchParams.get("$filter")!.includes("slug eq 'acme/sensors'"));
  assert(
    new URL(calls[1].url).searchParams.get("$filter")!.includes("belongs_to__application eq 1"),
  );
  assertEquals(result.deviceCount, 3);
  assertEquals(result.onlineCount, 2);
  assertEquals(result.pinnedCount, 1);
  assertEquals(result.notOnTargetCount, 2);
  assertEquals(result.targetReleaseId, 900);
  assertEquals(result.tracksLatest, true);
});

Deno.test("fleet-get: a numeric reference filters on the id", async () => {
  const { ctx, calls } = mockCtx([fleet, devices]);
  await action.execute({ fleet: "1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$filter"), "id eq 1");
});

/** balena answers an empty list, not a 404. */
Deno.test("fleet-get: an unmatched fleet explains why it cannot say which problem it is", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { d: [] } }]);
  const err = await assertRejects(
    async () => await action.execute({ fleet: "acme/nope" }, ctx),
    Error,
  );
  assert(/EMPTY LIST rather/.test(err.message), err.message);
  assert(/indistinguishable/.test(err.message), err.message);
});

Deno.test("fleet-get: requires a reference", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`fleet` is required");
  assertEquals(calls.length, 0);
});

/** A fleet with no target has nothing for its devices to be off. */
Deno.test("fleet-get: no target release means nothing counts as off-target", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { d: [{ id: 1, slug: "acme/new", should_be_running__release: null }] } },
    devices,
  ]);
  const result = await action.execute({ fleet: "acme/new" }, ctx) as Record<string, unknown>;
  assertEquals(result.targetReleaseId, undefined);
  assertEquals(result.notOnTargetCount, 0);
});
