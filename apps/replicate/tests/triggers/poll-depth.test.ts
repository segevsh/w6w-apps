import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newTraining from "../../triggers/new-training.ts";
import newDeployment from "../../triggers/new-deployment.ts";
import newModel from "../../triggers/new-model.ts";
import newOrUpdatedModel from "../../triggers/new-or-updated-model.ts";
import newModelVersion from "../../triggers/new-model-version.ts";

const API = "https://api.replicate.com/v1";
const model = (owner: string, name: string, version: string) => ({
  owner,
  name,
  latest_version: { id: version },
});

// Each case: the LITERAL request the trigger must make, plus an old and a fresh record.
const feeds = [
  {
    name: "new-training",
    trigger: newTraining,
    params: {},
    url: `${API}/trainings`,
    old: { id: "training-old", status: "succeeded" },
    fresh: { id: "training-new", status: "starting" },
  },
  {
    name: "new-deployment",
    trigger: newDeployment,
    params: {},
    url: `${API}/deployments`,
    old: { owner: "acme", name: "old-app" },
    fresh: { owner: "acme", name: "new-app" },
  },
  {
    name: "new-model",
    trigger: newModel,
    params: {},
    url: `${API}/models?sort_by=model_created_at&sort_direction=desc`,
    old: model("acme", "old", "v1"),
    fresh: model("acme", "fresh", "v1"),
  },
  {
    name: "new-or-updated-model",
    trigger: newOrUpdatedModel,
    params: {},
    url: `${API}/models?sort_by=latest_version_created_at&sort_direction=desc`,
    old: model("acme", "old", "v1"),
    fresh: model("acme", "old", "v2"), // an EDIT of a known model: a new latest version
  },
  {
    name: "new-model-version",
    trigger: newModelVersion,
    params: { model: "acme/widget" },
    url: `${API}/models/acme/widget/versions`,
    old: { id: "version-old", created_at: "2026-01-01T00:00:00Z" },
    fresh: { id: "version-new", created_at: "2026-01-02T00:00:00Z" },
  },
];

const run = async (
  t: (typeof feeds)[number]["trigger"],
  params: unknown,
  state: unknown,
  results: unknown[],
) => {
  const m = mockCtx([{ body: { next: null, previous: null, results } }]);
  const r = await t.poll!({ params, state, subscriptionId: "s" } as never, m.ctx);
  return { r, calls: m.calls };
};

for (const f of feeds) {
  test(`${f.name}: seeds, emits only the new record, retries identically, literal request`, async () => {
    const seed = await run(f.trigger, f.params, {}, [f.old]);
    assertEquals(seed.r.events, []);
    assertEquals((seed.r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, f.url);

    const page = [f.fresh, f.old];
    const first = await run(f.trigger, f.params, seed.r.nextState, page);
    const retry = await run(f.trigger, f.params, seed.r.nextState, page);
    assertEquals(first.r.events, [f.fresh]);
    assertEquals(retry.r, first.r);
    assertEquals(first.calls[0].method, "GET");
    assertEquals(first.calls[0].url, f.url);

    const quiet = await run(f.trigger, f.params, first.r.nextState, page);
    assertEquals(quiet.r.events, []);
  });
}

test("new-model-version requires a valid owner/name model", async () => {
  const m = mockCtx([{ body: { results: [] } }]);
  await assertRejects(newModelVersion.poll!({ params: {}, state: {}, subscriptionId: "s" }, m.ctx));
});

async function assertRejects(p: Promise<unknown>) {
  let threw = false;
  await p.catch(() => (threw = true));
  assertEquals(threw, true);
}
