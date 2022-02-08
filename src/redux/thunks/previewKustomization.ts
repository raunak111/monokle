import {ipcRenderer} from 'electron';

import {createAsyncThunk} from '@reduxjs/toolkit';

import log from 'loglevel';
import path from 'path';

import {ROOT_FILE_ENTRY} from '@constants/constants';

import {AppConfig} from '@models/appconfig';
import {AppDispatch} from '@models/appdispatch';
import {KustomizeCommandType} from '@models/kustomize';
import {RootState} from '@models/rootstate';

import {SetPreviewDataPayload} from '@redux/reducers/main';
import {createPreviewResult, createRejectionWithAlert} from '@redux/thunks/utils';

export type KustomizeCommandOptions = {
  folder: string;
  kustomizeCommand: KustomizeCommandType;
  enableHelm: boolean;
};

/**
 * Thunk to preview kustomizations
 */

export const previewKustomization = createAsyncThunk<
  SetPreviewDataPayload,
  string,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>('main/previewKustomization', async (resourceId, thunkAPI) => {
  const state = thunkAPI.getState().main;
  const appConfig = thunkAPI.getState().config;
  const k8sVersion = thunkAPI.getState().config.projectConfig?.k8sVersion;
  const resource = state.resourceMap[resourceId];
  if (resource && resource.filePath) {
    const rootFolder = state.fileMap[ROOT_FILE_ENTRY].filePath;
    const folder = path.join(rootFolder, resource.filePath.substr(0, resource.filePath.lastIndexOf(path.sep)));

    log.info(`previewing ${resource.id} in folder ${folder}`);
    const result = await runKustomize(folder, appConfig);

    if (result.error) {
      return createRejectionWithAlert(thunkAPI, 'Kustomize Error', result.error);
    }

    if (result.stdout) {
      return createPreviewResult(
        String(k8sVersion),
        result.stdout,
        resource.id,
        'Kustomize Preview',
        state.resourceRefsProcessingOptions
      );
    }
  }

  return {};
});

/**
 * Invokes kustomize in main thread
 */

function runKustomize(folder: string, appConfig: AppConfig): any {
  return new Promise(resolve => {
    ipcRenderer.once('kustomize-result', (event, arg) => {
      resolve(arg);
    });
    const kustomizeCommand = appConfig.projectConfig?.settings?.kustomizeCommand || appConfig.settings.kustomizeCommand;
    const enableHelmWithKustomize =
      appConfig.projectConfig?.settings?.enableHelmWithKustomize || appConfig.settings.enableHelmWithKustomize;
    ipcRenderer.send('run-kustomize', {
      folder,
      kustomizeCommand,
      enableHelm: enableHelmWithKustomize,
    } as KustomizeCommandOptions);
  });
}
