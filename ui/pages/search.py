from PySide6.QtCore import Qt
from PySide6.QtWidgets import QLabel, QLineEdit, QVBoxLayout, QWidget


class SearchPage(QWidget):
    """Search view. The search box exists now; real search logic lands in Phase 3-4."""

    def __init__(self):
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setContentsMargins(32, 32, 32, 32)
        layout.setAlignment(Qt.AlignTop)
        layout.setSpacing(12)

        title = QLabel("Search")
        title.setObjectName("PageTitle")
        layout.addWidget(title)

        search_box = QLineEdit()
        search_box.setObjectName("SearchBox")
        search_box.setPlaceholderText("Search artists, albums, songs…")
        search_box.setEnabled(False)  # wired up once the library exists
        layout.addWidget(search_box)

        subtitle = QLabel("Search will work once your library is scanned in Phase 3.")
        subtitle.setObjectName("PageSubtitle")
        layout.addWidget(subtitle)
