import traitlets

from persist_ext.internals.widgets.base.base_anywidget import BaseAnyWidget
from persist_ext.internals.widgets.base.output_processor import OutputProcessor


class WidgetWithTrrack(BaseAnyWidget):
    """
    Add traitlets for Trrack and interactions.

    _trrack_ is a dict of the Trrack JSON for the cell
    _interactions_ are list of interactions from `root` to `current`
    """

    trrack = traitlets.Dict().tag(sync=True)

    def __init__(self, id:str, *args, **kwargs):
        self.output: OutputProcessor
        super(WidgetWithTrrack, self).__init__(id=id, *args, **kwargs)
