import { Range } from '../utils';

export type Field<Dims extends number> = {
  field: string;
  domain: Range<Dims>;
  pixel: Range<Dims>;
};

export namespace Interactions {
  type BaseInteraction = {
    id: string;
    type: string;
    path: string;
  };

  type BaseSelection = BaseInteraction;

  export type SelectionInterval = BaseSelection & {
    type: 'selection_interval';
    name: string;
    params: {
      x: Field<2>;
      y: Field<2>;
    };
  };

  export type SelectionParams<SelectionType> = SelectionType extends {
    params: infer P;
  }
    ? P
    : never;

  export type SelectionSingle = BaseSelection & {
    type: 'selection_single';
  };

  export type SelectionMultiple = BaseSelection & {
    type: 'selection_multiple';
  };

  export type Selection =
    | SelectionInterval
    | SelectionSingle
    | SelectionMultiple;

  export type Filter = BaseInteraction & {
    type: 'filter';
  };

  export type Label = BaseInteraction & {
    type: 'filter';
  };

  export function isSelectionInterval(
    interaction: Interaction
  ): interaction is SelectionInterval {
    return interaction.type === 'selection_interval';
  }
}

export type Interaction =
  | Interactions.Selection
  | Interactions.Filter
  | Interactions.Label;

export type Interactions = Array<Interaction>;
