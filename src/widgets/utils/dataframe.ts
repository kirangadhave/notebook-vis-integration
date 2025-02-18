import { Interactions } from '../../interactions/interaction';

import { CommandRegistry } from '@lumino/commands';
import { BaseCommandArg } from '../../interactions/base';
import { castArgs } from '../../utils/castArgs';
import { AnyModel, ObjectHash } from '@anywidget/types';
import { NotebookActions } from '@jupyterlab/notebook';
import { PersistCommandRegistry, PersistCommands } from '../../commands';
import { TrrackProvenance } from '../trrack/types';
import { getInteractionsFromRoot } from '../trrack/utils';

export type GenerationRecord = {
  dfName: string;
  root_id?: string;
  current_node_id?: string;
  interactions: Interactions;
  isDynamic: boolean;
};

export type GeneratedRecord = {
  [key: string]: GenerationRecord;
};

// Command
export type CreateOrDeleteDataframeComandArgs = BaseCommandArg & {
  record: GenerationRecord;
  model: AnyModel<ObjectHash>;
  post?: 'copy' | 'insert';
};

export type PostDataframeGenerationCommandArg = {
  record: GenerationRecord;
};

export type DFGenerationMessage = {
  msg: {
    type: 'df_created';
    record: GenerationRecord;
    post?: 'copy' | 'insert';
  };
};

// Command Option
export const createDataframeCommandOption: CommandRegistry.ICommandOptions = {
  execute(args) {
    const { record, model, post } =
      castArgs<CreateOrDeleteDataframeComandArgs>(args);

    model.set('gdr_signal', {
      record,
      post
    });
    model.save_changes();
  }
};

export const deleteGeneratedDataframeCommandOption: CommandRegistry.ICommandOptions =
  {
    execute(args) {
      const { cell } = castArgs<CreateOrDeleteDataframeComandArgs>(args);

      cell;
    },
    label: 'Delete generated dataframe'
  };

export const copyGeneratedDataframeCommandOption: CommandRegistry.ICommandOptions =
  {
    execute(args) {
      const { record } = castArgs<PostDataframeGenerationCommandArg>(args);

      copyDFNameToClipboard(record.dfName)
        .then(() => {
          notifyCopySuccess(record.dfName);
        })
        .catch(err => {
          console.error(err);
          notifyCopyFailure(record.dfName, err);
        });
    }
  };

export const insertCellWithGeneratedDataframeCommandOption: CommandRegistry.ICommandOptions =
  {
    execute(args) {
      const { record } = castArgs<PostDataframeGenerationCommandArg>(args);

      addCellWithDataframeVariable(`${record.dfName}.head()`);
    }
  };

export function postCreationAction(
  record: GenerationRecord,
  action?: 'copy' | 'insert'
) {
  if (action === 'copy') {
    PersistCommandRegistry.instance.execute(PersistCommands.copyDataframe, {
      record
    });
  } else if (action === 'insert') {
    PersistCommandRegistry.instance.execute(
      PersistCommands.insertCellWithDataframe,
      {
        record
      }
    );
  }
}

async function copyDFNameToClipboard(name: string) {
  return await navigator.clipboard.writeText(name);
}

function notifyCopyFailure(name: string, error: Error) {
  window.Persist.Notification.notify(
    `Failed to copy ${name} to clipboard. ${error}`,
    'error',
    {
      autoClose: 500
    }
  );
}

function addCellWithDataframeVariable(dfName: string) {
  const currentNotebook = window.Persist.Notebook.nbPanel?.content;
  if (!currentNotebook) {
    return;
  }
  NotebookActions.insertBelow(currentNotebook);

  const newCell = currentNotebook.activeCell;

  if (!newCell) {
    return;
  }

  const text = newCell.model.sharedModel.getSource();

  if (text.length > 0) {
    throw new Error('New codecell should have no content!');
  }

  newCell.model.sharedModel.setSource(dfName);

  NotebookActions.run(
    currentNotebook,
    window.Persist.Notebook.nbPanel?.sessionContext
  );

  newCell.node.scrollIntoView(true);
}

export function getRecord(
  dfName: string,
  trrack: TrrackProvenance,
  isDynamic: boolean
): GenerationRecord {
  return {
    dfName,
    root_id: trrack.root.id,
    current_node_id: trrack.current.id,
    interactions: getInteractionsFromRoot(trrack),
    isDynamic
  };
}
