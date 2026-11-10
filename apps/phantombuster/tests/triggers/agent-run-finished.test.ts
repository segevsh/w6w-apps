import assert from "node:assert/strict";
import test from "node:test";
import agentRunFinished from "../../triggers/agent-run-finished.ts";

const CALLBACK = "https://w6w.example/triggers/webhooks/sub_123";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const post = (body: unknown) => ({ method: "POST", path: "/", query: {}, headers: {}, body });

test("onSubscribe makes no vendor call and hands back the callback URL; onUnsubscribe is a no-op", async () => {
  const state = await agentRunFinished.onSubscribe!(
    { params: {}, callbackUrl: CALLBACK },
    {} as never,
  );
  assert.deepEqual(state, { callbackUrl: CALLBACK });
  assert.equal(
    await agentRunFinished.onUnsubscribe!({ params: {}, state } as never, {} as never),
    undefined,
  );
});

test("handleIngest parses a successful run summary (the vendor's documented payload)", async () => {
  const out = evs(
    await agentRunFinished.handleIngest!({
      raw: post({
        agentId: "5027055349780535",
        agentName: "Test Script",
        containerId: "3358014727012763",
        script: "test_script_50516785467.js",
        scriptOrg: "phantombuster",
        branch: "test-branch-0545107204",
        launchDuration: 121,
        runDuration: 1850,
        resultObject: { rows: 3 },
        exitMessage: "finished",
        exitCode: 0,
      }),
    } as never),
  );
  assert.deepEqual(out, [{
    agentId: "5027055349780535",
    agentName: "Test Script",
    containerId: "3358014727012763",
    script: "test_script_50516785467.js",
    scriptOrg: "phantombuster",
    branch: "test-branch-0545107204",
    launchDuration: 121,
    runDuration: 1850,
    exitCode: 0,
    exitMessage: "finished",
    succeeded: true,
    resultObject: { rows: 3 },
  }]);
});

test("handleIngest marks a failed run (exit code 1, null result) as not succeeded", async () => {
  const out = evs(
    await agentRunFinished.handleIngest!({
      raw: post({
        agentId: "1",
        containerId: "2",
        launchDuration: 93,
        runDuration: 1034,
        resultObject: null,
        exitMessage: "finished",
        exitCode: 1,
      }),
    } as never),
  ) as Array<Record<string, unknown>>;
  assert.equal(out[0].succeeded, false);
  assert.equal(out[0].exitCode, 1);
  assert.equal(out[0].resultObject, null);
});

test("handleIngest refuses a non-POST call and a body that is not a run summary", async () => {
  await assert.rejects(
    async () =>
      await agentRunFinished.handleIngest!({ raw: { ...post({}), method: "GET" } } as never),
    /POST/,
  );
  for (const body of [null, [], "x", {}, { agentId: "1" }]) {
    await assert.rejects(
      async () => await agentRunFinished.handleIngest!({ raw: post(body) } as never),
      /Not a PhantomBuster webhook delivery/,
    );
  }
});
