import React, { useEffect, useMemo, useState } from 'react';
import { TrrackableCell } from '../../cells';
import {
  MRT_RowSelectionState,
  MantineReactTable,
  useMantineReactTable,
  MRT_ShowHideColumnsButton,
  type MRT_SortingState
} from 'mantine-react-table';
import { useModelState } from '@anywidget/react';
import {
  Data,
  applyDTypeToValue,
  getDType,
  getInputType,
  useColumnDefs
} from './helpers';
import { PersistCommands } from '../../commands';
import { Box, Divider, Menu, px } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { Nullable } from '../../utils/nullable';
import { DTypeContextMenu, PandasDTypes } from './DTypeContextMenu';
import { RenameTableColumnPopover } from './RenameTableColumnPopover';
import { isEqual } from 'lodash';

type Props = {
  cell: TrrackableCell;
};

const MRT_Row_Selection = 'mrt-row-select';
const MRT_Row_Actions = 'mrt-row-actions';
const MRT_Row_Drag = 'mrt-row-drag';
const MRT_Row_Expand = 'mrt-row-expand';
export const MRT_Row_Numbers = 'mrt-row-numbers';

export const PR_ANNOTATE = 'PR_Annotation';

const MRT_DisplayColumns = [
  MRT_Row_Selection,
  MRT_Row_Actions,
  MRT_Row_Drag,
  MRT_Row_Expand,
  MRT_Row_Numbers
];

function useSyncedState<T>(
  key: string,
  eq: (a: T, b: T) => boolean = isEqual
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [_stateFromModel] = useModelState<T>(key);

  const [state, setState] = useState<T>(_stateFromModel);

  useEffect(() => {
    setState(s => {
      if (eq(s, _stateFromModel)) {
        return s;
      }
      return _stateFromModel;
    });
  }, [_stateFromModel]);

  return [state, setState];
}

export function DatatableComponent({ cell }: Props) {
  // useModelState comes from anywidget and is used to get data from the python kernel (traitlet)
  const [data] = useModelState<Data>('data_values');
  const [dfVisibleColumns] = useModelState<string[]>(
    'df_columns_non_meta_with_annotations'
  );
  const [ID_COLUMN] = useModelState<string>('id_column');

  const [rowSelection, setRowSelection] = useSyncedState<MRT_RowSelectionState>(
    'df_row_selection_state'
  );

  const [open, setOpen] = useState(true);
  const [sorting, setSorting] =
    useSyncedState<MRT_SortingState>('df_sorting_state');

  const [dtypes] =
    useModelState<Record<string, PandasDTypes>>('df_column_types');
  const columns = useColumnDefs(
    cell,
    dfVisibleColumns.filter(d => d !== '__annotations'),
    ID_COLUMN,
    data,
    [],
    dtypes
  );

  // Add as required
  const dfColumnsWithInternal = useMemo(() => {
    return [
      MRT_Row_Selection,
      ...dfVisibleColumns.filter(d => d !== '__annotations')
    ];
  }, [dfVisibleColumns]);

  const table = useMantineReactTable({
    columns,
    data,
    enableDensityToggle: false,
    enableColumnResizing: true,
    columnResizeMode: 'onEnd',
    state: {
      rowSelection,
      columnOrder: dfColumnsWithInternal,
      sorting
    },
    initialState: {
      density: 'xs',
      columnOrder: dfColumnsWithInternal,
      columnPinning: {
        left: [MRT_Row_Selection, ID_COLUMN]
      },
      showGlobalFilter: true
    },
    // Non Trrack
    mantineTableProps: {
      // Styling for the table
      verticalSpacing: 2,
      striped: true,
      fz: 'xs'
    },
    enablePinning: true,
    mantinePaginationProps: {
      size: 'xs'
    },
    displayColumnDefOptions: {
      [MRT_Row_Selection]: {
        size: 1,
        enablePinning: false
      }
    },
    renderToolbarInternalActions: ({ table }) => {
      return (
        <>
          <MRT_ShowHideColumnsButton table={table} />
        </>
      );
    },
    //
    // Filtering table
    filterFns: {
      containsWithNullHandling: (row, id, filterValue) => {
        const val = row.getValue(id) as Nullable<string | number | Date>;

        if (!val) {
          return false;
        }

        return val.toString().includes(filterValue);
      }
    },
    globalFilterFn: 'containsWithNullHandling',
    positionGlobalFilter: 'left',
    enableColumnFilters: false,
    mantineFilterTextInputProps: ({ column }) => ({
      placeholder: `Search ${column.id}`
    }),
    mantineSearchTextInputProps: {
      size: 'xs'
    },
    // enableGlobalFilterModes: true,
    // globalFilterModeOptions: [
    //   'fuzzy',
    //   'equals',
    //   'startsWith',
    //   'contains',
    //   'notEmpty',
    //   'notEquals'
    // ],
    //
    // Selections
    // Seelct all is for page
    enableRowSelection: true,
    getRowId: row => row[ID_COLUMN] as string,
    positionToolbarAlertBanner: 'bottom',
    mantineSelectAllCheckboxProps: {
      size: 'xs',
      width: '100%',
      opacity: 1
    },
    mantineSelectCheckboxProps: {
      size: 'xs',
      width: '100%',
      opacity: 1
    },
    onRowSelectionChange: updater => {
      const selectedRows =
        typeof updater === 'function' ? updater(rowSelection) : updater;

      const selectedIds = Object.entries(selectedRows)
        .filter(([_, sel]) => sel)
        .map(([i, _]) => i);

      const rs: MRT_RowSelectionState = {};

      selectedIds.forEach(i => {
        rs[i] = true;
      });

      setRowSelection(rs);

      window.Persist.Commands.execute(PersistCommands.pointSelection, {
        cell,
        name: ID_COLUMN,
        store: [],
        value: selectedIds as any,
        brush_type: 'non-vega'
      });
    },
    // Column reordering
    enableColumnDragging: true,
    enableColumnOrdering: true,
    onColumnOrderChange: updater => {
      const newColumnOrder =
        typeof updater === 'function' ? updater(dfVisibleColumns) : updater;

      const filteredNewColumnOrder = newColumnOrder.filter(
        f => !MRT_DisplayColumns.includes(f)
      );

      let idxMoved = 0;
      while (
        (dfVisibleColumns[idxMoved] === filteredNewColumnOrder[idxMoved] ||
          dfVisibleColumns[idxMoved] ===
            filteredNewColumnOrder[idxMoved + 1]) &&
        idxMoved < dfVisibleColumns.length
      ) {
        idxMoved += 1;
      }

      if (!dfVisibleColumns[idxMoved]) {
        return;
      }

      window.Persist.Commands.execute(PersistCommands.reorderColumns, {
        cell,
        columns: filteredNewColumnOrder,
        overrideLabel: `Moved column '${
          dfVisibleColumns[idxMoved]
        }' moved to position '${filteredNewColumnOrder.indexOf(
          dfVisibleColumns[idxMoved]
        )}'`
      });
    },
    // Column Delete
    mantineColumnActionsButtonProps: {
      size: 'xs'
    },
    renderColumnActionsMenuItems: ({ internalColumnMenuItems, column }) => {
      return (
        <Box
          sx={{
            '& .mantine-Menu-item': {
              padding: px('0.5rem')
            },
            '& .mantine-Menu-itemIcon svg': {
              width: px('1.2rem')
            },
            '& .mantine-Menu-itemLabel span': {
              fontSize: px('0.875rem')
            },
            '& .mantine-Menu-itemLabel': {
              fontSize: px('0.875rem')
            },
            '& .mantine-Menu-itemLabel svg': {
              width: px('1rem')
            }
          }}
        >
          {![ID_COLUMN, PR_ANNOTATE].includes(column.id) && (
            <DTypeContextMenu column={column} cell={cell} />
          )}
          {![ID_COLUMN, PR_ANNOTATE].includes(column.id) && (
            <Menu.Item
              icon={<IconTrash />}
              onClick={() => {
                if (column.id === ID_COLUMN) {
                  return;
                }
                window.Persist.Commands.execute(PersistCommands.dropColumns, {
                  cell,
                  columns: [column.id]
                });
              }}
            >
              Drop column '{column.id}'
            </Menu.Item>
          )}
          {![ID_COLUMN, PR_ANNOTATE].includes(column.id) && (
            <>
              <RenameTableColumnPopover
                open={open}
                onClose={() => setOpen(false)}
                cell={cell}
                column={column}
                allColumnNames={dfVisibleColumns}
              />
            </>
          )}
          {/* {![ID_COLUMN, '__annotations'].includes(column.id) && ( */}
          {/*   <Menu.Item */}
          {/*     icon={<IconTableMinus />} */}
          {/*     onClick={() => { */}
          {/*       console.log('Hello?'); */}
          {/*     }} */}
          {/*   > */}
          {/*     Select missing or invalid */}
          {/*   </Menu.Item> */}
          {/* )} */}
          {![ID_COLUMN, PR_ANNOTATE].includes(column.id) && <Divider />}

          {internalColumnMenuItems}
        </Box>
      );
    },
    // Edit Cell
    enableEditing: true,
    editDisplayMode: 'cell',

    mantineEditTextInputProps: props => {
      return {
        size: 'xs',
        type: getInputType(getDType(props.column.id, dtypes)),
        onBlur: evt => {
          const columnName = props.cell.column.id;
          const row_index = props.cell.row.index;
          const dataPoint = data[row_index];

          if (evt.target.value.length === 0) {
            return;
          }

          const value = applyDTypeToValue(evt.target.value, dtypes[columnName]);

          if (typeof value === 'number' && isNaN(value)) {
            return dataPoint[columnName];
          }

          if (
            applyDTypeToValue(dataPoint[columnName], dtypes[columnName]) ===
            value
          ) {
            return dataPoint[columnName];
          }

          const idx = dataPoint[ID_COLUMN] as string;

          window.Persist.Commands.execute(PersistCommands.editCell, {
            cell,
            columnName,
            idx,
            value
          });
        }
      };
    },
    // Sorting
    manualSorting: true,
    enableMultiSort: true,
    enableSortingRemoval: false,
    mantineTableHeadCellProps: {
      sx: () => ({
        '& .mantine-TableHeadCell-Content-Labels': {
          justifyContent: 'space-between',
          width: '100%'
        },
        '& .mantine-TableHeadCell-Content-Wrapper': {
          flex: 1
        }
      })
    },
    maxMultiSortColCount: 3,
    onSortingChange: updater => {
      const sortStatus =
        typeof updater === 'function' ? updater(sorting) : updater;

      setSorting(sortStatus);

      window.Persist.Commands.execute(PersistCommands.sortByColumn, {
        cell,
        sortStatus
      });
    }
    // end
    //
  });

  return (
    <Box p="1em" miw="770px">
      <MantineReactTable table={table} />
    </Box>
  );
}
