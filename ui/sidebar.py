from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import QPushButton, QVBoxLayout, QWidget


class Sidebar(QWidget):
    """Left navigation rail. Emits page_changed(index) when a nav item is clicked."""

    page_changed = Signal(int)

    NAV_ITEMS = ["Home", "Library", "Search", "Playlists"]

    def __init__(self):
        super().__init__()
        self.setObjectName("Sidebar")
        self.setFixedWidth(220)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 24, 12, 12)
        layout.setSpacing(4)

        # Brand / app name at the top of the sidebar
        brand = QPushButton("🧟  Frankenstein")
        brand.setObjectName("Brand")
        brand.setEnabled(False)
        layout.addWidget(brand)
        layout.addSpacing(24)

        self.buttons: list[QPushButton] = []
        for index, name in enumerate(self.NAV_ITEMS):
            btn = QPushButton(name)
            btn.setObjectName("NavButton")
            btn.setCheckable(True)
            btn.setCursor(Qt.PointingHandCursor)
            btn.clicked.connect(lambda _checked, i=index: self._on_click(i))
            layout.addWidget(btn)
            self.buttons.append(btn)

        self.buttons[0].setChecked(True)
        layout.addStretch()

    def _on_click(self, index: int) -> None:
        for i, btn in enumerate(self.buttons):
            btn.setChecked(i == index)
        self.page_changed.emit(index)
