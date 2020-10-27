// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/* eslint-disable react-hooks/rules-of-hooks */
import { useRecoilCallback, CallbackInterface } from 'recoil';
import { BaseSchema, deleteActions, ITriggerCondition, LgTemplate, LgTemplateSamples, SDKKinds } from '@bfc/shared';
import get from 'lodash/get';

import { lgFilesState, luFilesState, schemasState, dialogState, localeState } from '../atoms/botState';
import { dispatcherState } from '../DispatcherWrapper';
import { dialogsSelectorFamily } from '../selectors';
import {
  onChooseIntentKey,
  generateNewDialog,
  intentTypeKey,
  qnaMatcherKey,
  TriggerFormData,
} from '../../utils/dialogUtil';

import { setError } from './shared';

const getDesignerIdFromDialogPath = (dialog, path) => {
  const value = get(dialog, path, '');
  const startIndex = value.lastIndexOf('_');
  const endIndex = value.indexOf('()');
  return value.substring(startIndex + 1, endIndex);
};

export const triggerDispatcher = () => {
  const createTrigger = useRecoilCallback(
    (callbackHelpers: CallbackInterface) => async (
      projectId: string,
      dialogId: string,
      formData: TriggerFormData,
      autoSelected = true
    ) => {
      try {
        const { snapshot } = callbackHelpers;
        const dispatcher = await snapshot.getPromise(dispatcherState);
        const lgFiles = await snapshot.getPromise(lgFilesState(projectId));
        const luFiles = await snapshot.getPromise(luFilesState(projectId));
        const dialogs = await snapshot.getPromise(dialogsSelectorFamily(projectId));
        const dialog = await snapshot.getPromise(dialogState({ projectId, dialogId }));
        const schemas = await snapshot.getPromise(schemasState(projectId));
        const locale = await snapshot.getPromise(localeState(projectId));

        const { createLuIntent, createLgTemplates, updateDialog, selectTo } = dispatcher;

        const lgFile = lgFiles.find((file) => file.id === `${dialogId}.${locale}`);
        const luFile = luFiles.find((file) => file.id === `${dialogId}.${locale}`);

        if (!luFile) throw new Error(`lu file ${dialogId} not found`);
        if (!lgFile) throw new Error(`lg file ${dialogId} not found`);
        if (!dialog) throw new Error(`dialog ${dialogId} not found`);
        const newDialog = generateNewDialog(dialogs, dialog.id, formData, schemas.sdk?.content);
        const index = get(newDialog, 'content.triggers', []).length - 1;
        if (formData.$kind === intentTypeKey && formData.triggerPhrases) {
          const intent = { Name: formData.intent, Body: formData.triggerPhrases };
          luFile && (await createLuIntent({ id: luFile.id, intent, projectId }));
        } else if (formData.$kind === qnaMatcherKey) {
          const designerId1 = getDesignerIdFromDialogPath(
            newDialog,
            `content.triggers[${index}].actions[0].actions[1].prompt`
          );
          const designerId2 = getDesignerIdFromDialogPath(
            newDialog,
            `content.triggers[${index}].actions[0].elseActions[0].activity`
          );
          const lgTemplates: LgTemplate[] = [
            LgTemplateSamples.TextInputPromptForQnAMatcher(designerId1) as LgTemplate,
            LgTemplateSamples.SendActivityForQnAMatcher(designerId2) as LgTemplate,
          ];
          await createLgTemplates({ id: lgFile.id, templates: lgTemplates, projectId });
        } else if (formData.$kind === onChooseIntentKey) {
          const designerId1 = getDesignerIdFromDialogPath(newDialog, `content.triggers[${index}].actions[4].prompt`);
          const designerId2 = getDesignerIdFromDialogPath(
            newDialog,
            `content.triggers[${index}].actions[5].elseActions[0].activity`
          );
          const lgTemplates1: LgTemplate[] = [
            LgTemplateSamples.TextInputPromptForOnChooseIntent(designerId1) as LgTemplate,
            LgTemplateSamples.SendActivityForOnChooseIntent(designerId2) as LgTemplate,
          ];

          let lgTemplates2: LgTemplate[] = [
            LgTemplateSamples.adaptiveCardJson as LgTemplate,
            LgTemplateSamples.whichOneDidYouMean as LgTemplate,
            LgTemplateSamples.pickOne as LgTemplate,
            LgTemplateSamples.getAnswerReadBack as LgTemplate,
            LgTemplateSamples.getIntentReadBack as LgTemplate,
          ];
          const commonlgFile = lgFiles.find(({ id }) => id === `common.${locale}`);

          lgTemplates2 = lgTemplates2.filter(
            (t) => commonlgFile?.templates.findIndex((clft) => clft.name === t.name) === -1
          );

          await createLgTemplates({ id: `common.${locale}`, templates: lgTemplates2, projectId });
          await createLgTemplates({ id: lgFile.id, templates: lgTemplates1, projectId });
        }
        const dialogPayload = {
          id: newDialog.id,
          projectId,
          content: newDialog.content,
        };
        await updateDialog(dialogPayload);
        if (autoSelected) {
          selectTo(projectId, null, null, `triggers[${index}]`);
        }
      } catch (ex) {
        setError(callbackHelpers, ex);
      }
    }
  );

  const deleteTrigger = useRecoilCallback(
    (callbackHelpers: CallbackInterface) => async (projectId: string, dialogId: string, trigger: ITriggerCondition) => {
      try {
        const { snapshot } = callbackHelpers;
        const dispatcher = await snapshot.getPromise(dispatcherState);

        const { removeLuIntent, removeLgTemplates } = dispatcher;

        if (get(trigger, '$kind') === SDKKinds.OnIntent) {
          const intentName = get(trigger, 'intent', '') as string;
          removeLuIntent({ id: dialogId, intentName, projectId });
        }

        // Clean action resources
        const actions = get(trigger, 'actions') as BaseSchema[];
        if (!actions || !Array.isArray(actions)) return;

        deleteActions(
          actions,
          (templateNames: string[]) => removeLgTemplates({ id: dialogId, templateNames, projectId }),
          (intentNames: string[]) =>
            Promise.all(intentNames.map((intentName) => removeLuIntent({ id: dialogId, intentName, projectId })))
        );
      } catch (ex) {
        setError(callbackHelpers, ex);
      }
    }
  );

  return {
    createTrigger,
    deleteTrigger,
  };
};
