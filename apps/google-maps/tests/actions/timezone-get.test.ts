import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { legacy } from "./_shared.ts";
import action, { formatOffset, parseTimestamp } from "../../actions/timezone-get.ts";

const berlinSummer = legacy({
  status: "OK",
  dstOffset: 3600,
  rawOffset: 3600,
  timeZoneId: "Europe/Berlin",
  timeZoneName: "Central European Summer Time",
});

/**
 * Neither half is the answer. `rawOffset` alone reads Berlin as +01:00 in July,
 * which is the classic scheduling bug.
 */
Deno.test("timezone-get: adds the two offsets, because neither is the answer alone", async () => {
  const { ctx } = mockCtx([berlinSummer]);
  const result = await action.execute!({
    location: "52.52,13.40",
    timestamp: "2026-07-01T12:00:00Z",
  }, ctx) as { totalOffsetSeconds: number; utcOffset: string; rawOffsetSeconds: number };
  assertEquals(result.rawOffsetSeconds, 3600);
  assertEquals(result.totalOffsetSeconds, 7200);
  assertEquals(result.utcOffset, "+02:00");
});

Deno.test("timezone-get: winter is the same zone with a different offset", async () => {
  const { ctx } = mockCtx([
    legacy({ status: "OK", dstOffset: 0, rawOffset: 3600, timeZoneId: "Europe/Berlin" }),
  ]);
  const result = await action.execute!({
    location: "52.52,13.40",
    timestamp: "2026-01-01T12:00:00Z",
  }, ctx) as { utcOffset: string };
  assertEquals(result.utcOffset, "+01:00");
});

Deno.test("timezone-get: the timestamp reaches the wire as Unix seconds", async () => {
  const { ctx, calls } = mockCtx([berlinSummer]);
  await action.execute!({ location: "52.52,13.40", timestamp: "1767225600" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/maps/api/timezone/json");
  assertEquals(url.searchParams.get("timestamp"), "1767225600");
  assertEquals(url.searchParams.get("location"), "52.52,13.4");
});

Deno.test("timezone-get: an omitted timestamp defaults to now rather than failing", async () => {
  const { ctx, calls } = mockCtx([berlinSummer]);
  await action.execute!({ location: "52.52,13.40" }, ctx);
  const sent = Number(new URL(calls[0].url).searchParams.get("timestamp"));
  const now = Math.floor(Date.now() / 1000);
  assert(Math.abs(sent - now) < 120, `${sent} vs ${now}`);
});

/** A pasted JavaScript timestamp would land in the year 56000, silently. */
Deno.test("timezone-get: milliseconds are recognised and converted", () => {
  assertEquals(parseTimestamp("1767225600000"), 1767225600);
  assertEquals(parseTimestamp("1767225600"), 1767225600);
});

Deno.test("timezone-get: an unparseable timestamp is refused", () => {
  assertEquals(typeof parseTimestamp(""), "number");
  try {
    parseTimestamp("next tuesday-ish");
    throw new Error("should have thrown");
  } catch (err) {
    assert(/neither Unix seconds nor a parseable date/.test(String(err)), String(err));
  }
});

Deno.test("timezone-get: renders offsets the way anything downstream wants them", () => {
  assertEquals(formatOffset(0), "+00:00");
  assertEquals(formatOffset(7200), "+02:00");
  assertEquals(formatOffset(-18000), "-05:00");
  assertEquals(formatOffset(20700), "+05:45");
  assertEquals(formatOffset(-12600), "-03:30");
});

/**
 * This one endpoint spells the field `errorMessage`; every sibling uses
 * `error_message`. Reading only the latter would report no reason at all.
 */
Deno.test("timezone-get: a refused key is explained despite the camelCase field", async () => {
  const { ctx } = mockCtx([
    legacy({ status: "REQUEST_DENIED", errorMessage: "The provided API key is invalid." }),
  ]);
  const error = await assertRejects(
    async () => await action.execute!({ location: "1,2" }, ctx),
    Error,
  );
  assert(/The provided API key is invalid/.test(error.message), error.message);
});

Deno.test("timezone-get: a swapped coordinate pair is caught before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ location: "152.52,13.40" }, ctx),
    Error,
    "latitude of 152.52",
  );
  assertEquals(calls.length, 0);
});

Deno.test("timezone-get: needs a location", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`location` is required");
});
