import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newContact from "../../triggers/new-contact.ts";
import newResponse from "../../triggers/new-response.ts";

const BASE = "https://app.formbricks.com/api/v1/management";
const ok = (...data: unknown[]) => ({ body: { data } });
const response = (id: string) => ({ id, surveyId: "s1", finished: true });

test("new-response: seeds, emits only the new response, retries identically, GETs limit=100", async () => {
  const seed = mockCtx([ok(response("r1"))]);
  const seeded = await newResponse.poll!({ params: {}, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, `${BASE}/responses?limit=100`);
  const page = ok(response("r2"), response("r1"));
  const first = await newResponse.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([page]).ctx,
  );
  const retry = await newResponse.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([page]).ctx,
  );
  assertEquals(first.events, [response("r2")]);
  assertEquals(retry, first);
});

test("new-response: a survey ID restricts the request to that survey", async () => {
  const m = mockCtx([ok(response("r1"))]);
  await newResponse.poll!({ params: { surveyId: "s9" }, state: {} }, m.ctx);
  assertEquals(m.calls[0].url, `${BASE}/responses?surveyId=s9&limit=100`);
});

test("new-response: never emits the single-use link token", async () => {
  const seeded = await newResponse.poll!(
    { params: {}, state: {} },
    mockCtx([ok(response("r1"))]).ctx,
  );
  const out = await newResponse.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([ok({ ...response("r2"), singleUseId: "test-single-use" }, response("r1"))]).ctx,
  );
  assertEquals(out.events, [response("r2")]);
  assertEquals(JSON.stringify(out.events).includes("singleUseId"), false);
});

test("new-contact: snapshot seeds, emits the added contact, retries identically, GETs contacts", async () => {
  const seed = mockCtx([ok({ id: "c1" })]);
  const seeded = await newContact.poll!({ params: {}, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, `${BASE}/contacts`);
  const run = () =>
    newContact.poll!(
      { params: {}, state: seeded.nextState },
      mockCtx([ok({ id: "c1" }, { id: "c2", userId: "u2" })]).ctx,
    );
  const first = await run();
  assertEquals(first.events, [{ id: "c2", userId: "u2" }]);
  assertEquals(await run(), first);
});
