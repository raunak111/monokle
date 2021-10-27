import {watch, FSWatcher} from 'chokidar';
import {AppConfig} from '@models/appconfig';
import {AppDispatch} from '@redux/store';
import {debounceWithPreviousArgs} from '@utils/helpers';
import {multiplePathsAdded, multipleFilesChanged, multiplePathsRemoved} from '@redux/reducers/main';

let watcher: FSWatcher;

/**
 * Creates a monitor for the specified folder and dispatches folder events using the specified dispatch
 */

export function monitorRootFolder(folder: string, appConfig: AppConfig, dispatch: AppDispatch) {
  if (watcher) {
    watcher.close();
  }

  watcher = watch(folder, {
    ignored: appConfig.scanExcludes,
    ignoreInitial: true,
    persistent: true,
    usePolling: true,
    interval: 2000,
  });

  watcher
    .on(
      'add',
      debounceWithPreviousArgs((args: any[]) => {
        const paths: Array<string> = args.map(arg => arg[0]);
        dispatch(multiplePathsAdded({paths, appConfig}));
      }, 1000)
    )
    .on(
      'addDir',
      debounceWithPreviousArgs((args: any[]) => {
        const paths: Array<string> = args.map(arg => arg[0]);
        dispatch(multiplePathsAdded({paths, appConfig}));
      }, 1000)
    )
    .on(
      'change',
      debounceWithPreviousArgs((args: any[]) => {
        const paths: Array<string> = args.map(arg => arg[0]);
        dispatch(multipleFilesChanged({paths, appConfig}));
      }, 1000)
    )
    .on(
      'unlink',
      debounceWithPreviousArgs((args: any[]) => {
        const paths: Array<string> = args.map(arg => arg[0]);
        dispatch(multiplePathsRemoved(paths));
      }, 1000)
    )
    .on(
      'unlinkDir',
      debounceWithPreviousArgs((args: any[]) => {
        const paths: Array<string> = args.map(arg => arg[0]);
        dispatch(multiplePathsRemoved(paths));
      }, 1000)
    );

  watcher
    /* eslint-disable no-console */
    .on('error', error => console.log(`Watcher error: ${error}`));
}
