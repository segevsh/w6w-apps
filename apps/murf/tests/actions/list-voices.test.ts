import { assertEquals } from "@std/assert";
import action, { filterVoices } from "../../actions/list-voices.ts";
import { exec, mockCtx } from "../_helpers.ts";

const voices: Parameters<typeof filterVoices>[0] = [
  {
    voiceId: "en-US-natalie",
    displayName: "Natalie",
    gender: "Female",
    locale: "en-US",
    description: "Warm",
    supportedLocales: {
      "en-US": { availableStyles: ["Conversational", "Promo"], detail: "US" },
      "es-ES": { availableStyles: ["Calm"] },
    },
  },
  {
    voiceId: "en-UK-ruby",
    displayName: "Ruby",
    gender: "Female",
    locale: "en-UK",
    supportedLocales: { "en-UK": { availableStyles: ["Conversational"] } },
  },
  { voiceId: "en-US-miles", displayName: "Miles", gender: "Male", locale: "en-US" },
];

Deno.test("list-voices: GETs /v1/speech/voices with the model query and returns everything unfiltered", async () => {
  const { ctx, calls } = mockCtx([{ body: voices }]);
  const out = await exec(action, { model: "gen2" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.murf.ai/v1/speech/voices?model=gen2");
  assertEquals([out.count, out.total], [3, 3]);
});

Deno.test("list-voices: no model sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await exec(action, {}, ctx);
  assertEquals(calls[0].url, "https://api.murf.ai/v1/speech/voices");
});

Deno.test("list-voices: filters by gender, locale (incl. supportedLocales), style and search", () => {
  const ids = (i: Record<string, string>) => filterVoices(voices, i).map((v) => v.voiceId);
  assertEquals(ids({ gender: "Male" }), ["en-US-miles"]);
  assertEquals(ids({ locale: "es-es" }), ["en-US-natalie"]);
  assertEquals(ids({ style: "conversational" }), ["en-US-natalie", "en-UK-ruby"]);
  assertEquals(ids({ locale: "en-UK", style: "Promo" }), []);
  assertEquals(ids({ search: "warm" }), ["en-US-natalie"]);
});

Deno.test("list-voices: counts reflect filtering; a non-array response fails", async () => {
  const { ctx } = mockCtx([{ body: voices }]);
  const out = await exec(action, { gender: "Female" }, ctx);
  assertEquals([out.count, out.total], [2, 3]);
  let msg = "";
  try {
    await exec(action, {}, mockCtx([{ body: { x: 1 } }]).ctx);
  } catch (e) {
    msg = String(e);
  }
  assertEquals(msg.includes("unexpected"), true);
});
