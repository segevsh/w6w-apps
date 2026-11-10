import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newAnimation from "../../triggers/new-animation.ts";
import newBatch from "../../triggers/new-batch.ts";
import newWorkflowRun from "../../triggers/new-workflow-run.ts";
import newToolJob from "../../triggers/new-tool-job.ts";
import newImageTemplate from "../../triggers/new-image-template.ts";
import newAnimationTemplate from "../../triggers/new-animation-template.ts";
import newWorkflow from "../../triggers/new-workflow.ts";
import newAsset from "../../triggers/new-asset.ts";
import newInstantUrl from "../../triggers/new-instant-url.ts";
import newPublication from "../../triggers/new-publication.ts";

const base = "https://api.bannerbear.com/v5";
const cases = [
  { name: "new-animation", trigger: newAnimation, path: "/animations" },
  { name: "new-batch", trigger: newBatch, path: "/batches" },
  { name: "new-workflow-run", trigger: newWorkflowRun, path: "/workflow_runs" },
  { name: "new-tool-job", trigger: newToolJob, path: "/tool_jobs" },
  { name: "new-image-template", trigger: newImageTemplate, path: "/image_templates" },
  { name: "new-animation-template", trigger: newAnimationTemplate, path: "/animation_templates" },
  { name: "new-workflow", trigger: newWorkflow, path: "/workflows" },
  { name: "new-asset", trigger: newAsset, path: "/assets" },
  { name: "new-instant-url", trigger: newInstantUrl, path: "/instant_urls" },
  { name: "new-publication", trigger: newPublication, path: "/publications" },
];
const input = { params: {}, subscriptionId: "sub-1" };
const item = (uid: string) => ({ uid });
const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

for (const { name, trigger, path } of cases) {
  test(`${name}: seeds without emitting, emits exactly the new item, retries idempotently`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item("b"), item("a")];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item("b")]);
    assertEquals(retry, first);
  });

  test(`${name}: requests page 1 of the wrapped list endpoint, one request, no page size`, async () => {
    const m = ctx([item("a")]);
    await trigger.poll!({ ...input, state: {} }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(m.calls[0].url, `${base}${path}?page=1`);
  });
}
