import React, {useCallback, useMemo, useState} from 'react';
import {useHotkeys} from 'react-hotkeys-hook';
import {useSelector} from 'react-redux';

import {ROOT_FILE_ENTRY} from '@constants/constants';
import hotkeys from '@constants/hotkeys';

import {useAppDispatch, useAppSelector} from '@redux/hooks';
import {
  openNewResourceWizard,
  setLeftMenuSelection,
  toggleLeftMenu,
  toggleRightMenu,
  toggleSettings,
} from '@redux/reducers/ui';
import {isInPreviewModeSelector} from '@redux/selectors';
import {applyFileWithConfirm} from '@redux/services/applyFileWithConfirm';
import {isKustomizationResource} from '@redux/services/kustomize';
import {startPreview, stopPreview} from '@redux/services/preview';
import {applyResource} from '@redux/thunks/applyResource';
import {performResourceDiff} from '@redux/thunks/diffResource';
import {selectFromHistory} from '@redux/thunks/selectionHistory';
import {setRootFolder} from '@redux/thunks/setRootFolder';

import FileExplorer from '@atoms/FileExplorer';

import ModalConfirmWithNamespaceSelect from '@components/molecules/ModalConfirmWithNamespaceSelect';

import {useFileExplorer} from '@hooks/useFileExplorer';

import featureJson from '@src/feature-flags.json';

const HotKeysHandler = () => {
  const dispatch = useAppDispatch();
  const mainState = useAppSelector(state => state.main);
  const configState = useAppSelector(state => state.config);
  const uiState = useAppSelector(state => state.ui);
  const isInPreviewMode = useSelector(isInPreviewModeSelector);

  const [isApplyModalVisible, setIsApplyModalVisible] = useState(false);

  const {openFileExplorer, fileExplorerProps} = useFileExplorer(
    ({folderPath}) => {
      if (!folderPath) {
        return;
      }
      dispatch(setRootFolder(folderPath));
    },
    {
      isDirectoryExplorer: true,
    }
  );

  useHotkeys(hotkeys.SELECT_FOLDER, () => {
    openFileExplorer();
  });

  useHotkeys(
    hotkeys.REFRESH_FOLDER,
    () => {
      if (mainState.fileMap && mainState.fileMap[ROOT_FILE_ENTRY] && mainState.fileMap[ROOT_FILE_ENTRY].filePath) {
        dispatch(setRootFolder(mainState.fileMap[ROOT_FILE_ENTRY].filePath));
      }
    },
    [mainState]
  );

  useHotkeys(hotkeys.TOGGLE_SETTINGS, () => {
    dispatch(toggleSettings());
  });

  const applySelection = useCallback(() => {
    if (!mainState.selectedResourceId) {
      return;
    }
    const selectedResource = mainState.resourceMap[mainState.selectedResourceId];
    if (selectedResource) {
      setIsApplyModalVisible(true);
    } else if (mainState.selectedPath) {
      applyFileWithConfirm(
        mainState.selectedPath,
        mainState.fileMap,
        dispatch,
        configState.kubeconfigPath,
        configState.kubeConfig.currentContext || ''
      );
    }
  }, [
    mainState.selectedResourceId,
    mainState.resourceMap,
    mainState.fileMap,
    configState.kubeconfigPath,
    configState.kubeConfig.currentContext,
    configState.settings.kustomizeCommand,
    mainState.selectedPath,
    mainState.previewType,
    dispatch,
  ]);

  const applySelectedResource = useMemo(() => {
    if (!mainState.selectedResourceId) {
      return [];
    }
    const resource = mainState.resourceMap[mainState.selectedResourceId];
    return resource ? [resource] : [];
  }, [mainState.selectedResourceId]);

  const onClickApplyResource = (namespace: string) => {
    if (!mainState.selectedResourceId) {
      setIsApplyModalVisible(false);
      return;
    }
    const selectedResource = mainState.resourceMap[mainState.selectedResourceId];

    if (!selectedResource) {
      setIsApplyModalVisible(false);
      return;
    }

    const isClusterPreview = mainState.previewType === 'cluster';
    applyResource(
      selectedResource.id,
      mainState.resourceMap,
      mainState.fileMap,
      dispatch,
      configState.kubeconfigPath,
      configState.kubeConfig.currentContext || '',
      namespace,
      {
        isClusterPreview,
        kustomizeCommand: configState.settings.kustomizeCommand,
      }
    );
    setIsApplyModalVisible(false);
  };

  const confirmModalTitle = useMemo(() => {
    if (!mainState.selectedResourceId) {
      return '';
    }
    const selectedResource = mainState.resourceMap[mainState.selectedResourceId];

    if (!selectedResource) {
      return '';
    }

    return isKustomizationResource(selectedResource)
      ? `Deploy ${selectedResource.name} kustomization to cluster [${configState.kubeConfig.currentContext || ''}]?`
      : `Deploy ${selectedResource.name} to cluster [${configState.kubeConfig.currentContext || ''}]?`;
  }, [mainState.selectedResourceId, configState.kubeConfig.currentContext]);

  useHotkeys(
    hotkeys.APPLY_SELECTION,
    () => {
      applySelection();
    },
    [applySelection]
  );

  const diffSelectedResource = useCallback(() => {
    if (mainState.selectedResourceId) {
      dispatch(performResourceDiff(mainState.selectedResourceId));
    }
  }, [mainState.selectedResourceId, dispatch]);

  useHotkeys(
    hotkeys.DIFF_RESOURCE,
    () => {
      diffSelectedResource();
    },
    [diffSelectedResource]
  );

  useHotkeys(
    hotkeys.PREVIEW_CLUSTER,
    () => {
      startPreview(configState.kubeconfigPath, 'cluster', dispatch);
    },
    [configState]
  );

  useHotkeys(
    hotkeys.EXIT_PREVIEW_MODE,
    () => {
      if (isInPreviewMode) {
        stopPreview(dispatch);
      }
    },
    [isInPreviewMode]
  );

  useHotkeys(hotkeys.TOGGLE_LEFT_PANE, () => {
    dispatch(toggleLeftMenu());
  });

  useHotkeys(hotkeys.TOGGLE_RIGHT_PANE, () => {
    if (featureJson.ShowRightMenu) {
      dispatch(toggleRightMenu());
    }
  });

  useHotkeys(hotkeys.SELECT_FROM_HISTORY_BACK, () => {
    selectFromHistory(
      'left',
      mainState.currentSelectionHistoryIndex,
      mainState.selectionHistory,
      mainState.resourceMap,
      mainState.fileMap,
      dispatch
    );
  });

  useHotkeys(hotkeys.SELECT_FROM_HISTORY_FORWARD, () => {
    selectFromHistory(
      'right',
      mainState.currentSelectionHistoryIndex,
      mainState.selectionHistory,
      mainState.resourceMap,
      mainState.fileMap,
      dispatch
    );
  });

  useHotkeys(
    hotkeys.OPEN_NEW_RESOURCE_WIZARD,
    () => {
      if (!uiState.newResourceWizard.isOpen && mainState.fileMap[ROOT_FILE_ENTRY]) {
        dispatch(openNewResourceWizard());
      }
    },
    [mainState.fileMap[ROOT_FILE_ENTRY]]
  );

  useHotkeys(hotkeys.OPEN_EXPLORER_TAB, () => {
    dispatch(setLeftMenuSelection('file-explorer'));
  });

  useHotkeys(hotkeys.OPEN_KUSTOMIZATION_TAB, () => {
    dispatch(setLeftMenuSelection('kustomize-pane'));
  });

  useHotkeys(hotkeys.OPEN_HELM_TAB, () => {
    dispatch(setLeftMenuSelection('helm-pane'));
  });

  return (
    <>
      <FileExplorer {...fileExplorerProps} />

      {isApplyModalVisible && (
        <ModalConfirmWithNamespaceSelect
          isModalVisible={isApplyModalVisible}
          resources={applySelectedResource}
          title={confirmModalTitle}
          onOk={selectedNamespace => onClickApplyResource(selectedNamespace)}
          onCancel={() => setIsApplyModalVisible(false)}
        />
      )}
    </>
  );
};

export default HotKeysHandler;
