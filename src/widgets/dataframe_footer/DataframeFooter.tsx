import React, { useCallback, useEffect } from 'react';
import { createRender, useModel, useModelState } from '@anywidget/react';
import { withTrrackableCell } from '../utils/useCell';
import {
  ActionIcon,
  Button,
  Group,
  Paper,
  TextInput,
  Tooltip
} from '@mantine/core';
import {
  DFGenerationMessage,
  GeneratedRecord,
  getRecord,
  postCreationAction
} from '../utils/dataframe';
import { TrrackableCell } from '../../cells';
import { DataframeNameBadge } from '../components/DataframeNameBadge';

import { IconCopy, IconRowInsertTop, IconX } from '@tabler/icons-react';
import { useValidatedState } from '@mantine/hooks';
import { isValidPythonVar } from '../utils/isValidPythonVar';
import { PersistCommandRegistry, PersistCommands } from '../../commands';
import { isEqual } from 'lodash';

type Props = {
  cell: TrrackableCell;
};

// Load record from nb and sync it with model
function useGeneratedDf(cell: TrrackableCell) {
  const model = useModel();
  const [generatedDfModel, setGeneratedDfModel] =
    useModelState<GeneratedRecord>('gdr_record');
  const [hasSynced] = useModelState<boolean>('gdr_has_synced');
  const [dynamicDatasetName] = useModelState<string>('gdr_dynamic_name');

  // Load from cell once
  useEffect(() => {
    if (!hasSynced) {
      setGeneratedDfModel(cell.generatedDataframes);
    }
  }, [cell, dynamicDatasetName, hasSynced]);

  // If model updates, update the cell as well
  useEffect(() => {
    if (!hasSynced) {
      return;
    }

    // If model version is not empty, check if they are equal
    if (isEqual(cell.generatedDataframes, generatedDfModel)) {
      return;
    }

    // If they are not equal, update the cell
    cell.generatedDataframesState.set(generatedDfModel);
  }, [cell, generatedDfModel, hasSynced]);

  return { generatedDfModel, setGeneratedDfModel, model };
}

export function DataframeFooter({ cell }: Props) {
  const { generatedDfModel, model, setGeneratedDfModel } = useGeneratedDf(cell);

  const [newDataframeName, setNewDataframeName] = useValidatedState(
    '',
    val => {
      if (val.length === 0) {
        return true;
      }
      return isValidPythonVar(val);
    },
    true
  );

  useEffect(() => {
    function _f({ msg }: DFGenerationMessage) {
      if (!msg) {
        return;
      }
      const { type, record, post = undefined } = msg;
      if (type === 'df_created') {
        postCreationAction(record, post);
      }
    }

    model.on('msg:custom', _f);

    return () => {
      model.off('msg:custom', _f);
    };
  }, [model]);

  const createDataframeHandler = useCallback(
    (post?: 'copy' | 'insert') => {
      PersistCommandRegistry.instance.execute(PersistCommands.createDataframe, {
        cell,
        model,
        record: getRecord(
          newDataframeName.lastValidValue,
          cell.trrackManager.trrack,
          false
        ),
        post
      });

      setNewDataframeName('');
    },
    [cell, model, newDataframeName]
  );

  return (
    <Paper shadow="lg" withBorder p="md" mx="xs">
      <Group align="flex-start">
        <TextInput
          size="xs"
          miw="150px"
          placeholder="Dataframe name..."
          value={newDataframeName.value}
          onChange={e => setNewDataframeName(e.target.value)}
          error={
            !newDataframeName.valid
              ? 'Please enter a valid python variable name'
              : null
          }
          rightSection={
            newDataframeName.value.length > 0 && (
              <ActionIcon size="xs" onClick={() => setNewDataframeName('')}>
                <IconX />
              </ActionIcon>
            )
          }
        />
        <Button.Group>
          <Tooltip label="Create dataframe and copy to clipboard" color="gray">
            <ActionIcon
              color="green"
              radius="xl"
              variant={
                newDataframeName.value.length === 0 || !newDataframeName.valid
                  ? 'transparent'
                  : 'subtle'
              }
              disabled={
                newDataframeName.value.length === 0 || !newDataframeName.valid
              }
              onClick={() => {
                createDataframeHandler('copy');
              }}
            >
              <IconCopy />
            </ActionIcon>
          </Tooltip>

          <Tooltip
            label="Create dataframe and insert new cell below"
            color="gray"
          >
            <ActionIcon
              radius="xl"
              color="green"
              variant={
                newDataframeName.value.length === 0 || !newDataframeName.valid
                  ? 'transparent'
                  : 'subtle'
              }
              disabled={
                newDataframeName.value.length === 0 || !newDataframeName.valid
              }
              onClick={() => {
                createDataframeHandler('insert');
              }}
            >
              <IconRowInsertTop />
            </ActionIcon>
          </Tooltip>
        </Button.Group>
      </Group>
      <Group mt="0.25em" p="0.25em">
        {Object.keys(generatedDfModel || {}).map(k => (
          <DataframeNameBadge
            cell={cell}
            key={k}
            dfRecord={generatedDfModel[k]}
            onDelete={record => {
              const gdr = { ...generatedDfModel };

              if (gdr[record.dfName]) {
                delete gdr[record.dfName];
              }

              setGeneratedDfModel(gdr);
            }}
          />
        ))}
      </Group>
    </Paper>
  );
}

export const render = createRender(withTrrackableCell(DataframeFooter));
