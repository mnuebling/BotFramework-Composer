// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { TelemetryEventName, TelemetryEvents } from '@bfc/shared';

import { getLogger } from './telemetryLogger';

export const getEventLogger = () => {
  const logger = getLogger();

  const log = <TN extends TelemetryEventName>(
    eventName: TN,
    ...args: TelemetryEvents[TN] extends undefined ? [never?] : [TelemetryEvents[TN]]
  ) => {
    logger.logEvent(eventName, { args });
  };

  return {
    log,
  };
};
