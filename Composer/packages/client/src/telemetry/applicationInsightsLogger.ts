// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { throttle } from 'lodash';

import { LogData, Logger } from '@bfc/shared';

export const appInsightsLogger = (): Logger => {
  const trackEvent = (name: string, properties?: LogData) => {
    console.log('bfc', name, properties);
  };

  const throttledTrackEvent = throttle(trackEvent, 10000);

  const logEvent = (name: string, properties?: LogData) => {
    throttledTrackEvent(name, properties);
  };

  const flush = () => {
    throttledTrackEvent.flush();
  };

  return {
    logEvent,
    flush,
  };
};
