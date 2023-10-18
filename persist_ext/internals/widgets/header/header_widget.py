import traitlets
from traitlets.traitlets import Unicode

from persist_ext.internals.utils.logger import logger
from persist_ext.internals.widgets.base.widget_with_trrack import WidgetWithTrrack


class HeaderWidget(WidgetWithTrrack):
    __widget_key = "header"
    cell_id = Unicode("").tag(sync=True)

    gen = traitlets.Unicode("").tag(sync=True)

    def __init__(self):
        super(HeaderWidget, self).__init__(widget_key=self.__widget_key)
        self.on_msg(self.log)

    def log(self, data, buffers):
        logger.info(data)
        logger.info(buffers)

    @traitlets.observe("trrack")
    def _on_trrack(self, _change):
        pass
