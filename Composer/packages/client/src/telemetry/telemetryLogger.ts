// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Logger, TelemetrySettings } from '@bfc/shared';
import noop from 'lodash/noop';

import { appInsightsLogger } from './applicationInsightsLogger';

const noopLogger = (): Logger => {
  return {
    logEvent: noop,
    flush: noop,
  };
};

const theLogger = {
  current: noopLogger(),
};

const createLogger = (telemetrySettings?: TelemetrySettings) => {
  return telemetrySettings?.allowDataCollection ? appInsightsLogger() : noopLogger();
};

export const initializeLogger = (telemetrySettings?: TelemetrySettings) => {
  theLogger.current = createLogger(telemetrySettings);
  return theLogger.current;
};

export const getLogger = () => theLogger.current;
