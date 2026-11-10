import type { TriggerDefinition } from "@w6w/types";
import {
  checkThreads,
  NEW_OR_UPDATED_THREAD_OUTPUT,
  NEW_OR_UPDATED_THREAD_PARAMS,
  NEW_OR_UPDATED_THREAD_SAMPLE,
  type ThreadParams,
} from "../lib/triggers.ts";

const newOrUpdatedThread: TriggerDefinition<ThreadParams> = {
  key: "new-or-updated-thread",
  title: "New or Updated Thread",
  description:
    "Runs when a conversation gets a new message (or changes) after the trigger was set up. The run gets the thread's id, snippet and history id; fetch the messages with Get Thread.",
  params: NEW_OR_UPDATED_THREAD_PARAMS,
  output: NEW_OR_UPDATED_THREAD_OUTPUT,
  sample: NEW_OR_UPDATED_THREAD_SAMPLE,
  minIntervalMs: 60_000,
  poll({ params, state }, ctx) {
    return checkThreads(params, state, ctx);
  },
};

export default newOrUpdatedThread;
