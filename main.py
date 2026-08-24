import sys
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QSizeGrip
from PyQt5.QtCore import Qt, QPoint, QRect
import deepl

# DeepL API 키
DEEPL_API_KEY = "여기에_API_키를_입력하세요"

RESIZE_MARGIN = 8
MIN_WIDTH = 300
MIN_HEIGHT = 100

CURSOR_BY_DIRECTION = {
    'left': Qt.SizeHorCursor,
    'right': Qt.SizeHorCursor,
    'top': Qt.SizeVerCursor,
    'bottom': Qt.SizeVerCursor,
    'top_left': Qt.SizeFDiagCursor,
    'bottom_right': Qt.SizeFDiagCursor,
    'top_right': Qt.SizeBDiagCursor,
    'bottom_left': Qt.SizeBDiagCursor,
}

class FreeTalkApp(QWidget):
    def __init__(self):
        super().__init__()
        try:
            self.translator = deepl.Translator(DEEPL_API_KEY)
        except Exception as e:
            print(f"API 키 오류: {e}")
            self.translator = None

        self._resizing = False
        self._resize_dir = None
        self._resize_start_pos = QPoint()
        self._resize_start_geom = QRect()

        self.initUI()
        self.oldPos = self.pos()

    def initUI(self):
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setGeometry(100, 100, 600, 150)
        self.setMinimumSize(MIN_WIDTH, MIN_HEIGHT)
        self.setMouseTracking(True)

        layout = QVBoxLayout()
        layout.setContentsMargins(10, 10, 10, 10)

        self.bg_widget = QWidget()
        self.bg_widget.setStyleSheet("background-color: rgba(0, 0, 0, 170); border-radius: 12px;")
        bg_layout = QVBoxLayout(self.bg_widget)

        self.src_label = QLabel("인식된 한국어 음성이 여기에 표시됩니다.", self)
        self.src_label.setStyleSheet("color: #E0E0E0; font-size: 16px;")
        self.src_label.setWordWrap(True)

        self.tgt_label = QLabel("Translated English text will appear here.", self)
        self.tgt_label.setStyleSheet("color: #FFD700; font-size: 22px; font-weight: bold;")
        self.tgt_label.setWordWrap(True)

        bg_layout.addWidget(self.src_label)
        bg_layout.addWidget(self.tgt_label)

        grip_layout = QHBoxLayout()
        grip_layout.addStretch()
        size_grip = QSizeGrip(self)
        grip_layout.addWidget(size_grip)
        bg_layout.addLayout(grip_layout)

        layout.addWidget(self.bg_widget)
        self.setLayout(layout)

    def _get_resize_direction(self, pos):
        x, y = pos.x(), pos.y()
        w, h = self.width(), self.height()
        on_left = x <= RESIZE_MARGIN
        on_right = x >= w - RESIZE_MARGIN
        on_top = y <= RESIZE_MARGIN
        on_bottom = y >= h - RESIZE_MARGIN

        if on_top and on_left:
            return 'top_left'
        if on_top and on_right:
            return 'top_right'
        if on_bottom and on_left:
            return 'bottom_left'
        if on_bottom and on_right:
            return 'bottom_right'
        if on_left:
            return 'left'
        if on_right:
            return 'right'
        if on_top:
            return 'top'
        if on_bottom:
            return 'bottom'
        return None

    def _apply_resize(self, global_pos):
        delta = global_pos - self._resize_start_pos
        geom = QRect(self._resize_start_geom)

        if 'left' in self._resize_dir:
            geom.setLeft(geom.left() + delta.x())
        if 'right' in self._resize_dir:
            geom.setRight(geom.right() + delta.x())
        if 'top' in self._resize_dir:
            geom.setTop(geom.top() + delta.y())
        if 'bottom' in self._resize_dir:
            geom.setBottom(geom.bottom() + delta.y())

        if geom.width() < MIN_WIDTH:
            if 'left' in self._resize_dir:
                geom.setLeft(geom.right() - MIN_WIDTH)
            else:
                geom.setRight(geom.left() + MIN_WIDTH)
        if geom.height() < MIN_HEIGHT:
            if 'top' in self._resize_dir:
                geom.setTop(geom.bottom() - MIN_HEIGHT)
            else:
                geom.setBottom(geom.top() + MIN_HEIGHT)

        self.setGeometry(geom)

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            direction = self._get_resize_direction(event.pos())
            if direction:
                self._resizing = True
                self._resize_dir = direction
                self._resize_start_pos = event.globalPos()
                self._resize_start_geom = self.geometry()
            else:
                self.oldPos = event.globalPos()

    def mouseMoveEvent(self, event):
        if event.buttons() == Qt.LeftButton:
            if self._resizing:
                self._apply_resize(event.globalPos())
            else:
                delta = QPoint(event.globalPos() - self.oldPos)
                self.move(self.x() + delta.x(), self.y() + delta.y())
                self.oldPos = event.globalPos()
        else:
            direction = self._get_resize_direction(event.pos())
            cursor = CURSOR_BY_DIRECTION.get(direction, Qt.ArrowCursor)
            self.setCursor(cursor)

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.LeftButton:
            self._resizing = False
            self._resize_dir = None

    def translate_and_update(self, text, target_lang="EN-US"):
        if self.translator:
            result = self.translator.translate_text(text, target_lang=target_lang)
            self.tgt_label.setText(result.text)

if __name__ == '__main__':
    app = QApplication(sys.argv)
    ex = FreeTalkApp()
    ex.show()
    sys.exit(app.exec_())
