import type { AppDefinition } from "@w6w/types";
import captureEvent from "./actions/capture-event.ts";
import personList from "./actions/person-list.ts";
import personGet from "./actions/person-get.ts";
import cohortList from "./actions/cohort-list.ts";
import featureFlagList from "./actions/feature-flag-list.ts";
import featureFlagGet from "./actions/feature-flag-get.ts";
import insightList from "./actions/insight-list.ts";
import annotationCreate from "./actions/annotation-create.ts";
import personalApiKey from "./auth/personal-api-key.ts";
import service from "./health/service.ts";

export default {
  actions: [
    captureEvent,
    personList,
    personGet,
    cohortList,
    featureFlagList,
    featureFlagGet,
    insightList,
    annotationCreate,
  ],
  auth: [personalApiKey],
  healthChecks: [service],
} satisfies AppDefinition;
