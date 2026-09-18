import sys
from pathlib import Path

from PySide6.QtWidgets import QApplication

from ui.main_window import MainWindow

BASE_DIR = Path(__file__).resolve().parent


def load_stylesheet(app: QApplication) -> None:
    """Load the dark theme QSS. Swappable later for a theme engine."""
    qss_path = BASE_DIR / "styles" / "dark.qss"
    with open(qss_path, "r") as f:
        app.setStyleSheet(f.read())


def main() -> None:
    app = QApplication(sys.argv)
    app.setApplicationName("Frankenstein")
    load_stylesheet(app)

    window = MainWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
