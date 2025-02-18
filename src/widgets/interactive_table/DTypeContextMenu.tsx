import { Group, Menu, Popover, Stack, Button, Select } from '@mantine/core';
import {
  IconCheck,
  IconDatabase,
  IconPlayerPlayFilled
} from '@tabler/icons-react';
import React, { useState } from 'react';

import { MRT_Column } from 'mantine-react-table';
import { DataPoint } from './helpers';
import { useModelState } from '@anywidget/react';
import { PersistCommandRegistry, PersistCommands } from '../../commands';
import { TrrackableCell } from '../../cells';

const pandasDTypes = [
  'Int64',
  'Float64',
  'string',
  'boolean',
  'datetime64[ns]',
  'category'
] as const;

export const pandasDTypesLabels: Record<(typeof pandasDTypes)[number], string> =
  {
    string: 'string',
    boolean: 'boolean',
    Float64: 'float',
    Int64: 'integer',
    category: 'category',
    'datetime64[ns]': 'datetime'
  };

export type PandasDTypes = (typeof pandasDTypes)[number];

type Props = {
  cell: TrrackableCell;
  column: MRT_Column<DataPoint>;
};

const DateFormatOptions = {
  EpochTime: {
    value: 'EpochTime',
    label: 'Epoch Time (e.g. 1698861600000)'
  },
  ISO8601DateTime: {
    value: 'ISO8601',
    label: 'ISO 8601 Date and Time (e.g., "2023-01-01T12:00:00")'
  },
  ShortDate: { value: '%m/%d/%y', label: 'Short Date (e.g., "01/01/23")' },
  LongDate: { value: '%d, %Y', label: 'Long Date (e.g., "01, 2023")' },
  TimeWithSeconds: {
    value: '%H:%M:%S',
    label: '24-Hour Time with Seconds (e.g., "12:00:00")'
  },
  Time12HourWithAMPM: {
    value: '%I:%M %p',
    label: '12-Hour Time with AM/PM (e.g., "12:00 PM")'
  },
  RFC822Date: {
    value: '%d %b %y %H:%M:%S UTC',
    label: 'RFC 822 Date (e.g., "01 Jan 23 12:00:00 UTC")'
  },
  YearMonth: { value: '%Y-%m', label: 'Year-Month (e.g., "2023-01")' },
  YearMonthDay: {
    value: '%Y-%m-%d',
    label: 'Year-Month-Day (e.g., "2023-01-01")'
  },
  TimeOnly: { value: '%H:%M', label: 'Time Only (e.g., "12:00")' },
  YearOnly: { value: '%Y', label: 'Year Only (e.g., "2023")' }
};

export function DTypeContextMenu({ cell, column }: Props) {
  const [dataframeDtypes] =
    useModelState<Record<string, PandasDTypes>>('df_column_types');

  const [dateFormat, setDateFormat] = useState<string | null>(
    DateFormatOptions.ShortDate.value
  );

  return (
    <Menu.Item icon={<IconDatabase />} closeMenuOnClick={false}>
      <Menu
        shadow="xl"
        position="right-start"
        offset={15}
        withArrow
        closeDelay={400}
      >
        <Menu.Target>
          <Group position="apart">
            <span>Change column '{column.id}' data type</span>

            <IconPlayerPlayFilled size="1em" />
          </Group>
        </Menu.Target>

        <Menu.Dropdown>
          {pandasDTypes.map(d => (
            <Menu.Item
              icon={
                <IconCheck opacity={dataframeDtypes[column.id] === d ? 1 : 0} />
              }
              closeMenuOnClick={d !== 'datetime64[ns]'}
              key={d}
              disabled={dataframeDtypes[column.id] === d}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();

                if (d === 'datetime64[ns]') {
                  return;
                }

                if (dataframeDtypes[column.id] === d) {
                  return;
                }

                PersistCommandRegistry.instance.execute(
                  PersistCommands.changeColumnDataType,
                  {
                    cell,
                    columnDataTypes: {
                      [column.id]: {
                        type: d
                      }
                    }
                  }
                );
              }}
            >
              {d !== 'datetime64[ns]' ? (
                pandasDTypesLabels[d]
              ) : (
                <Popover
                  shadow="xl"
                  position="right-start"
                  offset={15}
                  withArrow
                >
                  <Popover.Target>
                    <Group position="apart">
                      <span>{pandasDTypesLabels[d]}</span>

                      <IconPlayerPlayFilled size="1em" />
                    </Group>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <Stack>
                      <Select
                        miw="300px"
                        value={dateFormat}
                        onChange={setDateFormat}
                        size="xs"
                        label="Select a datetime format"
                        data={Object.values(DateFormatOptions)}
                      />

                      <Button
                        size="xs"
                        variant="light"
                        color="green"
                        disabled={!dateFormat}
                        onClick={() => {
                          if (dateFormat) {
                            PersistCommandRegistry.instance.execute(
                              PersistCommands.changeColumnDataType,
                              {
                                cell,
                                columnDataTypes: {
                                  [column.id]: {
                                    type: d,
                                    format: dateFormat
                                  }
                                }
                              }
                            );
                          }
                        }}
                      >
                        Confirm
                      </Button>
                    </Stack>
                  </Popover.Dropdown>
                </Popover>
              )}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </Menu.Item>
  );
}
