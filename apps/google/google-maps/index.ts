/**
 * Google Maps Platform — geocode and validate addresses, search places, compute
 * routes and matrices, snap GPS traces to roads, and read time zones and
 * elevation.
 *
 * Two API generations behind one key, and they disagree about how to fail: see
 * `lib/client.ts`. What decides the bill is `lib/fields.ts`. What decides
 * whether any of it works is which APIs are enabled on the Cloud project, which
 * is what `health/apis.ts` is for.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import apis from "./health/apis.ts";
import quota from "./health/quota.ts";

import geocode from "./actions/geocode.ts";
import geocodeReverse from "./actions/geocode-reverse.ts";
import addressValidate from "./actions/address-validate.ts";
import placeSearchText from "./actions/place-search-text.ts";
import placeSearchNearby from "./actions/place-search-nearby.ts";
import placeAutocomplete from "./actions/place-autocomplete.ts";
import placeGet from "./actions/place-get.ts";
import placePhoto from "./actions/place-photo.ts";
import routeCompute from "./actions/route-compute.ts";
import routeMatrix from "./actions/route-matrix.ts";
import timezoneGet from "./actions/timezone-get.ts";
import elevationGet from "./actions/elevation-get.ts";
import geolocate from "./actions/geolocate.ts";
import roadsSnap from "./actions/roads-snap.ts";
import roadsNearest from "./actions/roads-nearest.ts";

const app: AppDefinition = {
  actions: [
    geocode,
    geocodeReverse,
    addressValidate,
    placeSearchText,
    placeSearchNearby,
    placeAutocomplete,
    placeGet,
    placePhoto,
    routeCompute,
    routeMatrix,
    timezoneGet,
    elevationGet,
    geolocate,
    roadsSnap,
    roadsNearest,
  ],
  auth: [apiKey],
  healthChecks: [service, apis, quota],
};

export default app;
