import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import listAccounts from "./actions/list-accounts.ts";
import getAccount from "./actions/get-account.ts";
import listLocations from "./actions/list-locations.ts";
import getLocation from "./actions/get-location.ts";
import updateLocation from "./actions/update-location.ts";
import getLocationAttributes from "./actions/get-location-attributes.ts";
import updateLocationAttributes from "./actions/update-location-attributes.ts";
import listCategories from "./actions/list-categories.ts";
import listAttributeMetadata from "./actions/list-attribute-metadata.ts";
import listQuestions from "./actions/list-questions.ts";
import upsertAnswer from "./actions/upsert-answer.ts";
import deleteAnswer from "./actions/delete-answer.ts";
import listPlaceActionLinks from "./actions/list-place-action-links.ts";
import createPlaceActionLink from "./actions/create-place-action-link.ts";
import deletePlaceActionLink from "./actions/delete-place-action-link.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listAccounts,
    getAccount,
    listLocations,
    getLocation,
    updateLocation,
    getLocationAttributes,
    updateLocationAttributes,
    listCategories,
    listAttributeMetadata,
    listQuestions,
    upsertAnswer,
    deleteAnswer,
    listPlaceActionLinks,
    createPlaceActionLink,
    deletePlaceActionLink,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
