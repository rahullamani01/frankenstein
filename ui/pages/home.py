from PySide6.QtCore import Qt
from PySide6.QtWidgets import QLabel, QVBoxLayout, QWidget


class HomePage(QWidget):
    """Landing page. Phase 4 fills this with recently played, mixes, recommendations."""

    def __init__(self):
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setContentsMargins(32, 32, 32, 32)
        layout.setAlignment(Qt.AlignTop)
        layout.setSpacing(8)

        title = QLabel("Good evening")
        title.setObjectName("PageTitle")
        layout.addWidget(title)

        subtitle = QLabel(
            "Recently Played, Made For You, and Discover Something New\n"
            "will show up here once the library and recommendation engine exist."
        )
        subtitle.setObjectName("PageSubtitle")
        layout.addWidget(subtitle)
