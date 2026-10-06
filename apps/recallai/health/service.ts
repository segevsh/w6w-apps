import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Recall.ai publishes no status page this app can read. Checked 2026-10-06: `status.recall.ai`
 * does not resolve, `www.recall.ai/status` is a 404, the docs index (`docs.recall.ai/llms.txt`)
 * and the Regions and Getting Started pages link none, and the `recall` / `recallai` slugs on
 * statuspage.io and instatus.com redirect to those vendors' marketing homepages. Declared as an
 * absence rather than inventing one; `informational` keeps the permanent `unknown` from pinning
 * the app's verdict. Whether the API is answering is the `api` check's job.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Recall.ai publishes no public status page: status.recall.ai does not resolve and neither " +
      "the docs nor the website link one. Use the api check for reachability.",
  },
};

export default service;
