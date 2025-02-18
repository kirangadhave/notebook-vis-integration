import {
  NodeId,
  Registry,
  UnsubscribeCurrentChangeListener,
  initializeTrrack
} from '@trrack/core';
import { ISignal, Signal } from '@lumino/signaling';
import { TrrackableCell } from '../../cells';
import { Interaction } from '../../interactions/interaction';
import { Nullable } from '../../utils/nullable';
import { UUID } from '../../utils/uuid';
import { LabelLike, getLabelFromLabelLike } from './labelGen';
import { PayloadAction } from '@reduxjs/toolkit';
import {
  TrrackState,
  TrrackGraph,
  TrrackProvenance,
  TrrackEvents
} from './types';
import { hookstate } from '@hookstate/core';
import { PersistCommandRegistry } from '../../commands';

const defaultTrrackState: TrrackState = {
  id: UUID(),
  type: 'create'
};

export class TrrackManager {
  private static _instanceMaps: WeakMap<TrrackableCell, TrrackManager> =
    new WeakMap();

  static getInstance(cell: TrrackableCell) {
    return new TrrackManager(cell);
  }

  private _trrack!: TrrackProvenance;
  private _notifyTrrackInstanceChange: Signal<this, TrrackProvenance> =
    new Signal(this);

  private _registry = Registry.create<TrrackEvents>();
  private _addInteractionAction: ReturnType<
    typeof this._registerAddInteractionAction
  >;

  private _notifyCurrentChange: Signal<this, NodeId> = new Signal(this);
  private _unsubscribeCurrentChangeListener: Nullable<UnsubscribeCurrentChangeListener> =
    null;

  undoRedoStatus = hookstate({
    canUndo: false,
    canRedo: false
  });

  constructor(private _cell: TrrackableCell) {
    TrrackManager._instanceMaps.set(_cell, this);
    this._addInteractionAction = this._registerAddInteractionAction();

    this.loadTrrack(this._cell.trrackGraph);
  }

  get trrackInstanceChange(): ISignal<this, TrrackProvenance> {
    return this._notifyTrrackInstanceChange;
  }

  get currentChange(): ISignal<this, NodeId> {
    return this._notifyCurrentChange;
  }

  get trrack() {
    return this._trrack;
  }

  reset() {
    this.loadTrrack();
    this._cell.generatedDataframesState.set({});
  }

  saveToJupyter() {
    this._cell.trrackGraphState.set(this._graph);
  }

  loadTrrack(graphToLoad: Nullable<TrrackGraph> = null) {
    const onCurrentChange = () => {
      this._cell.trrackGraphState.set(this._graph);
      this.undoRedoStatus
        .nested('canUndo')
        .set(this.trrack.current.id !== this.trrack.root.id);

      this.undoRedoStatus
        .nested('canRedo')
        .set(this.trrack.current.children.length > 0);

      PersistCommandRegistry.instance.registry.notifyCommandChanged();
      this._notifyCurrentChange.emit(this._trrack.current.id);
    };

    if (this._unsubscribeCurrentChangeListener) {
      this._unsubscribeCurrentChangeListener();
    }

    this._trrack = initializeTrrack<TrrackState, TrrackEvents>({
      registry: this._registry,
      initialState: defaultTrrackState
    });

    if (graphToLoad && graphToLoad.root !== this._trrack.root.id) {
      this._trrack.importObject(graphToLoad);
    }

    this._unsubscribeCurrentChangeListener =
      this._trrack.currentChange(onCurrentChange);

    onCurrentChange();

    this._notifyTrrackInstanceChange.emit(this._trrack);
  }

  apply<T extends Interaction = Interaction>(action: T, label: LabelLike) {
    return this._trrack.apply(
      getLabelFromLabelLike(label),
      this._addInteractionAction(action)
    );
  }

  private get _graph(): TrrackGraph {
    return this._trrack.exportObject();
  }

  private _registerAddInteractionAction(): (
    interaction: Interaction
  ) => PayloadAction<Interaction> {
    return (interaction: Interaction) => {
      if (!this._registry.has(interaction.type)) {
        this._registry.register(
          interaction.type,
          (_, interaction: Interaction) => {
            return interaction;
          }
        );
      }

      return {
        type: interaction.type,
        payload: interaction
      };
    };
  }
}
