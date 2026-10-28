import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/blob-set-tier.ts";

const D = { display: { account: "myaccount" } };
const current = (tier: string) => ({
  status: 200,
  body: "",
  headers: { "x-ms-access-tier": tier },
});
const ok = { status: 200, body: "" };

Deno.test("blob-set-tier: reads the current tier, then PUTs comp=tier", async () => {
  const { ctx, calls } = mockCtx([current("Hot"), ok], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log", tier: "Cool" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "HEAD");
  assertEquals(new URL(calls[1].url).searchParams.get("comp"), "tier");
  assertEquals(calls[1].headers["x-ms-access-tier"], "Cool");
  assertEquals(result.tier, "Cool");
  assert(/30 days/.test(String(result.minimumDurationNote)));
});

/** Archive is offline, not slow. */
Deno.test("blob-set-tier: archiving needs an acknowledgement", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute({ container: "uploads", blob: "a.log", tier: "Archive" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmArchive`/.test(message), message);
  assert(/up to 15 hours/.test(message), message);
  assert(/180 days/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("blob-set-tier: an acknowledged archive goes through and warns", async () => {
  const { ctx, logs } = mockCtx([current("Hot"), ok], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log", tier: "Archive", confirmArchive: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.readable, false);
  assertEquals(logs[0].level, "warn");
  assert(/unreadable until rehydrated/.test(logs[0].message), logs[0].message);
});

/** Whether this is a rehydration depends on where the blob is now. */
Deno.test("blob-set-tier: coming out of Archive is reported as a rehydration", async () => {
  const { ctx, calls, logs } = mockCtx([current("Archive"), ok], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log", tier: "Hot", rehydratePriority: "High" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.rehydrating, true);
  assertEquals(result.readable, false, "it stays unreadable until the rehydration finishes");
  assertEquals(calls[1].headers["x-ms-rehydrate-priority"], "High");
  assert(/up to an hour/.test(logs[0].message), logs[0].message);
});

Deno.test("blob-set-tier: the priority is only sent when rehydrating", async () => {
  const { ctx, calls } = mockCtx([current("Hot"), ok], D);
  await action.execute(
    { container: "uploads", blob: "a.log", tier: "Cool", rehydratePriority: "High" },
    ctx,
  );
  assertEquals(calls[1].headers["x-ms-rehydrate-priority"], undefined);
});

/** Every move restarts the destination tier's minimum. */
Deno.test("blob-set-tier: Hot has no minimum and the cold tiers each have their own", async () => {
  for (const [tier, days] of [["Cool", "30"], ["Cold", "90"]] as Array<[string, string]>) {
    const { ctx } = mockCtx([current("Hot"), ok], D);
    const result = await action.execute(
      { container: "uploads", blob: "a.log", tier },
      ctx,
    ) as Record<string, unknown>;
    assert(new RegExp(`${days} days`).test(String(result.minimumDurationNote)), tier);
  }

  const { ctx } = mockCtx([current("Cool"), ok], D);
  const hot = await action.execute(
    { container: "uploads", blob: "a.log", tier: "Hot" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(hot.minimumDurationNote, undefined);
});

Deno.test("blob-set-tier: says a tier is not only a price", () => {
  assert(/UNREADABLE until rehydrated/.test(action.description!), action.description);
  assert(/restarts the destination tier's minimum/.test(action.description!), action.description);
});
