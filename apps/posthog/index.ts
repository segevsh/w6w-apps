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
import eventCaptured from "./triggers/event-captured.ts";
import pageview from "./triggers/pageview.ts";
import personIdentified from "./triggers/person-identified.ts";
import featureFlagCalled from "./triggers/feature-flag-called.ts";
import newCohort from "./triggers/new-cohort.ts";
import newFeatureFlag from "./triggers/new-feature-flag.ts";
import newOrUpdatedInsight from "./triggers/new-or-updated-insight.ts";

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
  triggers: [
    eventCaptured,
    pageview,
    personIdentified,
    featureFlagCalled,
    newCohort,
    newFeatureFlag,
    newOrUpdatedInsight,
  ],
  auth: [personalApiKey],
  healthChecks: [service],
} satisfies AppDefinition;
