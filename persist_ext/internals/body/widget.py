import anywidget
from traitlets.traitlets import Unicode

from persist_ext.internals.utils.entry_paths import get_widget_esm_css


class BodyWidget(anywidget.AnyWidget):
    _esm, _css = get_widget_esm_css("body")

    cell_id = Unicode("").tag(sync=True)

    def __init__(self, widget) -> None:
        super().__init__(widget)
