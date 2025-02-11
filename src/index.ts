import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Cell } from '@jupyterlab/cells';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { TrrackableCellFactory } from './cells';
import { DELETE_NB_METADATA, NotebookWrapper } from './notebook';
import { setupPersist } from './utils/globals';
import { ICommandPalette } from '@jupyterlab/apputils';

/**
 * Initialization data for the persist_ext extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'persist_ext:plugin',
  description:
    'PersIst is a JupyterLab extension to enable persistent interactive visualizations in JupyterLab notebooks.',
  autoStart: true,
  requires: [INotebookTracker],
  optional: [ISettingRegistry],
  activate: (
    _app: JupyterFrontEnd,
    nbTracker: INotebookTracker,
    settingRegistry: ISettingRegistry | null
  ) => {
    // Setup window.Persist
    console.log('Setting up persist');
    setupPersist();

    // Listen to notebook changes
    nbTracker.currentChanged.connect((_, nbPanel) => {
      const wrapper = new NotebookWrapper(nbPanel);
      // This is shared between all tabs
      window.Persist.Notebook = wrapper;

      wrapper.setupFinish.then(() => {
        console.log(wrapper.nbUid, 'is ready!');
      });
    });

    console.log('JupyterLab extension persist_ext is activated!');

    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('persist_ext settings loaded:', settings);
        })
        .catch(reason => {
          console.error('Failed to load settings for persist_ext.', reason);
        });
    }
  }
};

const TRRACKABLE_CELL_PLUGIN = 'persist_ext:trrackable-cell-plugin';

const trrackableCellPlugin: JupyterFrontEndPlugin<NotebookPanel.ContentFactory> =
  {
    id: TRRACKABLE_CELL_PLUGIN,
    description: 'Trrackable cell plugin companion',
    autoStart: true,
    provides: NotebookPanel.IContentFactory,
    requires: [IEditorServices, ICommandPalette],
    activate: (
      app: JupyterFrontEnd,
      editor: IEditorServices,
      palette: ICommandPalette
    ) => {
      console.log('JupyterLab extension trrackable-persist-cell is activated!');

      const { commands } = app;

      const clearPersistMetaCommand = 'persist:meta:clear';
      const clearPersistResetAllTrrack = 'persist:meta:reset-all-trrack';

      commands.addCommand(clearPersistResetAllTrrack, {
        label: 'Reset Trrack instances for all cells',
        execute: () => {
          window.Persist.CellMap.forEach(cell => {
            if (cell?._trrackManager) {
              cell?.trrackManager.reset();
            }
          });

          window.Persist.Notebook.save();
        }
      });

      commands.addCommand(clearPersistMetaCommand, {
        label: 'Clear all persist metadata from cells and the notebook',
        execute: () => {
          const keys = window.Persist.Notebook.getPersistKeyRecord();
          keys.push('__CATEGORIES__', '__USER_ADDED_CATEGORIES__');
          keys.forEach(key => {
            window.Persist.Notebook.metadata.write(key, DELETE_NB_METADATA);
          });

          commands.execute(clearPersistResetAllTrrack);

          // window.Persist.CellMap.forEach(cell => {
          //   keys.forEach(k => cell?.model?.deleteMetadata(k));
          // });

          window.Persist.Notebook.save();
          console.log('Cleared persist keys and saved!');
        }
      });

      palette.addItem({
        category: 'Persist',
        command: clearPersistMetaCommand
      });

      const factory = new Cell.ContentFactory({
        editorFactory: editor.factoryService.newInlineEditor
      });

      return new TrrackableCellFactory(factory);
    }
  };

export default [plugin, trrackableCellPlugin];
