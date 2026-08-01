import type { AppDefinition } from "@w6w/types";
import pipelineTrigger from "./actions/pipeline-trigger.ts";
import pipelineGet from "./actions/pipeline-get.ts";
import pipelineList from "./actions/pipeline-list.ts";
import workflowList from "./actions/workflow-list.ts";
import workflowGet from "./actions/workflow-get.ts";
import workflowCancel from "./actions/workflow-cancel.ts";
import jobList from "./actions/job-list.ts";
import jobGet from "./actions/job-get.ts";
import apiToken from "./auth/api-token.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    pipelineTrigger,
    pipelineGet,
    pipelineList,
    workflowList,
    workflowGet,
    workflowCancel,
    jobList,
    jobGet,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
