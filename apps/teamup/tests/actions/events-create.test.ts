import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/events-create.ts";

const sample = { id: 41, object: "event", name: "Yoga Flow" };

Deno.test("events-create: posts the documented body to /events", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: sample }]);
  const result = await action.execute!({
    starts_at: "2026-09-22T06:00:00Z",
    ends_at: "2026-09-22T07:00:00Z",
    name: "Yoga Flow",
    venue: 3,
    offering_type: 7,
    instructors: "5, 6",
    category: 2,
    max_occupancy: 18,
    description: "Morning flow",
    registration_timelines: [{ opens: 1 }],
    external_id: "x-1",
  }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/events");
  assertEquals(JSON.parse(calls[0].body!), {
    starts_at: "2026-09-22T06:00:00Z",
    ends_at: "2026-09-22T07:00:00Z",
    name: "Yoga Flow",
    venue: 3,
    offering_type: 7,
    instructors: [5, 6],
    category: 2,
    max_occupancy: 18,
    description: "Morning flow",
    registration_timelines: [{ opens: 1 }],
    external_id: "x-1",
  });
  assertEquals(result.id, 41);
});

Deno.test("events-create: drops the body fields the caller left unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: sample }]);
  await action.execute!({
    starts_at: "2026-09-22T06:00:00Z",
    ends_at: "2026-09-22T07:00:00Z",
    name: "Yoga Flow",
    venue: 3,
    offering_type: 7,
    instructors: "5",
  }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), [
    "starts_at",
    "ends_at",
    "name",
    "venue",
    "offering_type",
    "instructors",
  ]);
});

/** The form field is a string; the body field has to be a real array. */
Deno.test("events-create: sends instructors as an array, not a string", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: sample }]);
  await action.execute!({ instructors: "5, 6" } as never, ctx);
  assertEquals(JSON.parse(calls[0].body!).instructors, [5, 6]);
});

Deno.test("events-create: declares the six required schedule fields", () => {
  assertEquals(action.type, "perform");
  for (const key of ["starts_at", "ends_at", "name", "venue", "offering_type", "instructors"]) {
    assertEquals(action.params!.find((p) => p.key === key)!.required, true, key);
  }
});
