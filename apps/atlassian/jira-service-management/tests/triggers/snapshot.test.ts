import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockJsmCtx } from "../_helpers.ts";
import newServiceDesk from "../../triggers/new-service-desk.ts";
import newOrganization from "../../triggers/new-organization.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const BASE = "https://acme.atlassian.net/rest/servicedeskapi";
const sd = (id: string) => ({ id, projectName: `P${id}` });
const page = (ids: string[], isLastPage = true) => ({
  body: { values: ids.map(sd), size: ids.length, start: 0, isLastPage },
});

test("new-service-desk seeds, emits only the new desk, retries identically, GETs /servicedesk", async () => {
  const seed = mockJsmCtx([page(["1", "2"])]);
  const seeded = await newServiceDesk.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, `${BASE}/servicedesk?start=0&limit=100`);
  const run = () =>
    newServiceDesk.poll!(
      { ...input, state: seeded.nextState },
      mockJsmCtx([page(["1", "2", "3"])]).ctx,
    );
  const first = await run();
  assertEquals(first.events, [sd("3")]);
  assertEquals(await run(), first);
});

test("new-service-desk reads at most 5 pages and then fails naming the cap", async () => {
  const two = mockJsmCtx([page(["1"], false), page(["2"])]);
  await newServiceDesk.poll!({ ...input, state: {} }, two.ctx);
  assertEquals(two.calls.length, 2);
  assertEquals(two.calls[1].url, `${BASE}/servicedesk?start=100&limit=100`);
  const endless = mockJsmCtx(Array.from({ length: 6 }, (_, i) => page([`n${i}`], false)));
  await assertRejects(
    () => newServiceDesk.poll!({ ...input, state: {} }, endless.ctx),
    Error,
    "500",
  );
  assertEquals(endless.calls.length, 5);
});

test("new-organization seeds, emits only the new organization, GETs /organization", async () => {
  const org = (id: string) => ({ id, name: `O${id}` });
  const body = (ids: string[]) => ({
    body: { values: ids.map(org), size: ids.length, start: 0, isLastPage: true },
  });
  const seed = mockJsmCtx([body(["1"])]);
  const seeded = await newOrganization.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls[0].url, `${BASE}/organization?start=0&limit=100`);
  const got = await newOrganization.poll!(
    { ...input, state: seeded.nextState },
    mockJsmCtx([body(["2", "1"])]).ctx,
  );
  assertEquals(got.events, [org("2")]);
});
