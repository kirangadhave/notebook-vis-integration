import React, { useRef, useState } from 'react';
import { MRT_Column } from 'mantine-react-table';
import { DataPoint } from './helpers';
import { Text, Box, TextInput, Tooltip } from '@mantine/core';
import { getHotkeyHandler, useValidatedState } from '@mantine/hooks';
import { TrrackableCell } from '../../cells';
import { PersistCommands } from '../../commands';

type Props = {
  cell: TrrackableCell;
  column: MRT_Column<DataPoint>;
  allColumns: string[];
};

export function ColumnHeader({ column, allColumns, cell }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  const [newColumnName, setNewColumnName] = useValidatedState(
    column.id,
    val => {
      return val.length > 0 && !allColumns.includes(val);
    },
    true
  );

  const [isEditing, setIsEditing] = useState(false);

  return isEditing ? (
    <TextInput
      ref={ref}
      value={newColumnName.value}
      onChange={e => {
        setNewColumnName(e.target.value);
      }}
      error={!newColumnName.valid}
      onBlur={() => {
        if (
          newColumnName.value &&
          newColumnName.value.length > 0 &&
          newColumnName.valid &&
          newColumnName.value !== column.id
        ) {
          window.Persist.Commands.execute(PersistCommands.renameColumns, {
            cell,
            renameColumnMap: {
              [column.id]: newColumnName.value
            }
          });
        } else {
          setNewColumnName(column.id);
        }
        setIsEditing(false);
      }}
      autoFocus
      onKeyDown={getHotkeyHandler([['Enter', () => ref.current?.blur()]])}
      size="xs"
    />
  ) : (
    <Box
      sx={{
        cursor: 'initial'
      }}
      w="100%"
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onDoubleClick={e => {
        e.stopPropagation();
        e.preventDefault();
        setIsEditing(true);
      }}
    >
      <Tooltip label={column.id} withinPortal>
        <Text w="min-content" sx={{ cursor: 'text' }}>
          {column.id}
        </Text>
      </Tooltip>
    </Box>
  );
}
