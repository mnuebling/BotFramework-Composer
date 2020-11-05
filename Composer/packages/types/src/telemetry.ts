// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export type LogData = Record<string, unknown>;

export type Logger = {
  logEvent: (name: string, properties?: LogData) => void;
  flush: () => void;
};

type BotProjectEvents = {
  CreateBotUsingNewButton: null;
};

type DesignerEvents = {
  ActionAdded: { type: string };
  ActionDeleted: { type: string };
  ToolTipOpened: null;
};

type OtherEvents = {
  HelpLinkClicked: { url: string };
};

export type TelemetryEvents = BotProjectEvents & DesignerEvents & OtherEvents;

export type TelemetryEventName = keyof TelemetryEvents;

export type TelemetrySettings = {
  allowDataCollection?: boolean | null;
};

export type ServerSettings = {
  telemetry?: TelemetrySettings;
};

export type EventLogger = {
  log: <TN extends TelemetryEventName>(
    eventName: TN,
    ...args: TelemetryEvents[TN] extends undefined ? [never?] : [TelemetryEvents[TN]]
  ) => void;
};
