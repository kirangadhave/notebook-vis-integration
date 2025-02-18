import { IDisposable } from '@lumino/disposable';

import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import {
  SelectionCommandArgs,
  selectionCommandOption
} from '../interactions/selection';
import { BaseCommandArg } from '../interactions/base';
import { castArgs } from '../utils/castArgs';
import { FilterCommandArgs, filterCommandOption } from '../interactions/filter';
import {
  AnnotateCommandArgs,
  annotateCommandOption
} from '../interactions/annotate';
import { CommandRegistry } from '@lumino/commands';
import {
  RenameColumnCommandArgs,
  renameColumnCommandOption
} from '../interactions/renameColumn';
import {
  DropColumnsCommandArgs,
  dropColumnsCommandOption
} from '../interactions/dropColumn';
import {
  CategorizeCommandArgs,
  categorizeCommandOption
} from '../interactions/categorize';
import {
  SortByColumnCommandArgs,
  sortbyColumnCommandOption
} from '../interactions/sortByColumn';
import {
  ReorderColumnsCommandArgs,
  reorderColumnsCommandOption
} from '../interactions/reorderColumns';
import {
  ChangeColumnTypeCommandArgs,
  changeColumnTypeCommandOption
} from '../interactions/changeColumnType';
import {
  EditCellCommandArgs,
  editCellCommandOption
} from '../interactions/editCell';
import {
  IntentSelectionCommandArgs,
  intentSelectionCommandOption
} from '../interactions/intentSelection';
import {
  CreateOrDeleteDataframeComandArgs,
  PostDataframeGenerationCommandArg,
  copyGeneratedDataframeCommandOption,
  createDataframeCommandOption,
  deleteGeneratedDataframeCommandOption,
  insertCellWithGeneratedDataframeCommandOption
} from '../widgets/utils/dataframe';

export namespace PersistCommands {
  // Reset Trrack
  export const resetTrrack = 'persist:trrack:reset';

  // Selections
  export const pointSelection = 'persist:selection:point';
  export const intervalSelection = 'persist:selection:interval';
  export const intentSelection = 'persist:selection:intent';
  export const invertSelection = 'persist:selection:invert';
  export const clearSelection = 'persist:selection:clear';

  // Categorizey
  export const categorize = 'persist:category:assign';

  // Filters
  export const filterOut = 'persist:filter:out';
  export const filterIn = 'persist:filter:in';

  // Column Ops
  export const sortByColumn = 'persist:column:sort';
  export const reorderColumns = 'persist:column:order';
  export const renameColumns = 'persist:column:rename';
  export const dropColumns = 'persist:column:drop';
  export const changeColumnDataType = 'persist:column:changetype';

  // Annotation
  export const annotate = 'persist:annotate';

  // Edit Value
  export const editCell = 'persist:data:edit';

  // Generate
  export const createDataframe = 'persist:dataframe:create';
  export const copyDataframe = 'persist:dataframe:copy';
  export const insertCellWithDataframe = 'persist:dataframe:insert-cell';
  export const deleteDataframe = 'persist:dataframe:delete';
}

export type CommandArgMap = {
  [PersistCommands.resetTrrack]: BaseCommandArg;
  [PersistCommands.intervalSelection]: SelectionCommandArgs;
  [PersistCommands.intentSelection]: IntentSelectionCommandArgs;
  [PersistCommands.pointSelection]: SelectionCommandArgs;
  [PersistCommands.categorize]: CategorizeCommandArgs;
  [PersistCommands.filterIn]: FilterCommandArgs;
  [PersistCommands.filterOut]: FilterCommandArgs;
  [PersistCommands.annotate]: AnnotateCommandArgs;
  [PersistCommands.renameColumns]: RenameColumnCommandArgs;
  [PersistCommands.dropColumns]: DropColumnsCommandArgs;
  [PersistCommands.sortByColumn]: SortByColumnCommandArgs;
  [PersistCommands.reorderColumns]: ReorderColumnsCommandArgs;
  [PersistCommands.changeColumnDataType]: ChangeColumnTypeCommandArgs;
  [PersistCommands.editCell]: EditCellCommandArgs;
  [PersistCommands.createDataframe]: CreateOrDeleteDataframeComandArgs;
  [PersistCommands.deleteDataframe]: CreateOrDeleteDataframeComandArgs;
  [PersistCommands.copyDataframe]: PostDataframeGenerationCommandArg;
  [PersistCommands.insertCellWithDataframe]: PostDataframeGenerationCommandArg;
};

/**
 * A registry of commands for the persist extension.
 * Implemented as a singleton
 */
export class PersistCommandRegistry {
  private _commandsDisposeMap = new Map<string, IDisposable>();
  private _commands: CommandRegistry = new CommandRegistry();

  private static _instance: PersistCommandRegistry;

  /**
   * The singleton instance of the command registry.
   */
  static get instance() {
    if (!PersistCommandRegistry._instance) {
      PersistCommandRegistry._instance = new PersistCommandRegistry();
    }

    return PersistCommandRegistry._instance;
  }

  /**
   * Private constructor enforces singleton pattern.
   */
  private constructor() {
    this.addCommand(PersistCommands.resetTrrack, {
      isEnabled(args) {
        const { cell } = castArgs<BaseCommandArg>(args);
        const { nodes } = cell.trrackManager.trrack.exportObject();

        return Object.keys(nodes).length > 1;
      },
      execute(args) {
        const { cell } = castArgs<BaseCommandArg>(args);
        cell.trrackManager.reset();
      },
      label: 'Reset Trrack'
    });
    this.addCommand(PersistCommands.pointSelection, selectionCommandOption);
    this.addCommand(PersistCommands.intervalSelection, selectionCommandOption);
    this.addCommand(
      PersistCommands.intentSelection,
      intentSelectionCommandOption
    );
    this.addCommand(PersistCommands.invertSelection, {
      execute() {
        throw new Error('not impl');
      }
    });
    this.addCommand(PersistCommands.clearSelection, {
      execute() {
        throw new Error('not impl');
      }
    });
    this.addCommand(PersistCommands.categorize, categorizeCommandOption);
    this.addCommand(PersistCommands.filterOut, filterCommandOption);
    this.addCommand(PersistCommands.filterIn, filterCommandOption);
    this.addCommand(PersistCommands.sortByColumn, sortbyColumnCommandOption);
    this.addCommand(
      PersistCommands.reorderColumns,
      reorderColumnsCommandOption
    );
    this.addCommand(PersistCommands.renameColumns, renameColumnCommandOption);
    this.addCommand(PersistCommands.dropColumns, dropColumnsCommandOption);
    this.addCommand(PersistCommands.annotate, annotateCommandOption);
    this.addCommand(
      PersistCommands.changeColumnDataType,
      changeColumnTypeCommandOption
    );
    this.addCommand(PersistCommands.editCell, editCellCommandOption);
    this.addCommand(
      PersistCommands.createDataframe,
      createDataframeCommandOption
    );
    this.addCommand(
      PersistCommands.deleteDataframe,
      deleteGeneratedDataframeCommandOption
    );
    this.addCommand(
      PersistCommands.copyDataframe,
      copyGeneratedDataframeCommandOption
    );
    this.addCommand(
      PersistCommands.insertCellWithDataframe,
      insertCellWithGeneratedDataframeCommandOption
    );
  }

  addCommand(id: string, opts: CommandRegistry.ICommandOptions) {
    const disposable = this._commands.addCommand(id, opts);

    this._commandsDisposeMap.set(id, disposable);
  }

  removeCommand(id: string) {
    if (!this._commands.hasCommand(id)) {
      return false;
    }

    const disposable = this._commandsDisposeMap.get(id);
    if (!disposable) {
      return false;
    }

    disposable.dispose();
    this._commandsDisposeMap.delete(id);
    return true;
  }

  execute<K extends keyof CommandArgMap>(id: K, args: CommandArgMap[K]) {
    return this._commands.execute(
      id,
      args as unknown as ReadonlyPartialJSONObject
    );
  }

  get registry() {
    return this._commands;
  }
}
