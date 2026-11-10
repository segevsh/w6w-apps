import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import bucketList from "../actions/bucket-list.ts";

/**
 * `ListBuckets` returns every bucket the account owns in one call (a bounded, per-account
 * collection: https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBuckets.html), so each check
 * diffs the bucket names against the previous check (`pollSnapshot`, added only). More than the
 * kit's 5000-row cap is a failed check that names the cap.
 */
const trigger: TriggerDefinition = {
  key: "new-bucket",
  title: "New Bucket",
  description: "The run gets each newly created S3 bucket in the account.",
  minIntervalMs: 300_000,
  output: [
    { key: "name", type: "string", label: "Bucket name" },
    { key: "creationDate", type: "string", label: "Creation date" },
  ],
  sample: { name: "my-bucket", creationDate: "2026-11-09T10:00:00.000Z" },
  async poll({ state }, ctx) {
    const out = await bucketList.execute({} as never, ctx) as {
      buckets: Array<{ name: string; creationDate?: string }>;
    };
    const buckets = out.buckets.filter((b) => b.name);
    const byName = new Map(buckets.map((b) => [b.name, b]));
    const { events, nextState } = await pollSnapshot({
      state,
      rows: buckets.map((b) => ({ key: b.name, values: { name: b.name } })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => byName.get(e.key)), nextState };
  },
};

export default trigger;
