import type { ActionDefinition } from "@w6w/types";
import { JenkinsClient, jobPath, parseQueueId, type QueryParams } from "../lib/client.ts";

interface Input {
  job: string;
  parameters?: Record<string, string | number | boolean>;
}

interface Output {
  queueId?: number;
  queueUrl?: string;
}

/**
 * Jenkins' own remote API docs give two trigger endpoints: `POST
 * .../build` (no parameters) and `POST .../buildWithParameters` (form-encoded
 * body). Rather than model these as two actions, this one picks the endpoint
 * based on whether `parameters` was given — an empty/omitted map triggers a
 * plain build, any keys switch to `buildWithParameters`.
 *
 * Neither call returns a build — it queues one. The only useful signal in the
 * response is the `Location` header pointing at the new queue item
 * (`.../queue/item/<id>/`); `get-queue-item` resolves it to an actual build
 * once Jenkins schedules an executor.
 */
const triggerBuild: ActionDefinition<Input, Output> = {
  key: "trigger-build",
  type: "perform",
  resource: "build",
  title: "Trigger Build",
  description: "Queue a build for a job, with or without build parameters.",
  idempotent: false,
  params: [
    {
      key: "job",
      label: "Job",
      type: "string",
      required: true,
      placeholder: "my-job",
      hint: "Job name, or `folder/job` for a job nested in a folder (Folders plugin / " +
        "multibranch pipeline).",
    },
    {
      key: "parameters",
      label: "Build Parameters",
      type: "json",
      hint: "Key/value map of build parameters. Leave empty to trigger without parameters " +
        "(`.../build`) — any keys here switch to `.../buildWithParameters`.",
    },
  ],
  output: [
    { key: "queueId", type: "number", label: "Queue item ID" },
    { key: "queueUrl", type: "string", label: "Queue item URL" },
  ],

  async execute(input, ctx) {
    const client = JenkinsClient.fromConnection(ctx);
    const hasParams = !!input.parameters && Object.keys(input.parameters).length > 0;
    const path = `/${jobPath(input.job)}/${hasParams ? "buildWithParameters" : "build"}`;
    const result = await client.post(
      path,
      hasParams ? { form: input.parameters as QueryParams } : {},
    );
    return {
      queueId: parseQueueId(result.location),
      queueUrl: result.location ?? undefined,
    };
  },
};

export default triggerBuild;
