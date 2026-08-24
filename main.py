import sys
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QSizeGrip
from PyQt5.QtCore import Qt, QPoint
import deepl

# DeepL API 키
DEEPL_API_KEY = "여기에_API_키를_입력하세요"

class FreeTalkApp(QWidget):
    def __init__(self):
        super().__init__()
        try:
            self.translator = deepl.Translator(DEEPL_API_KEY)
        except Exception as e:
            print(f"API 키 오류: {e}")
            self.translator = None

        self.initUI()
        self.oldPos = self.pos()

    def initUI(self):
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setGeometry(100, 100, 600, 150)

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

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.oldPos = event.globalPos()

    def mouseMoveEvent(self, event):
        if event.buttons() == Qt.LeftButton:
            delta = QPoint(event.globalPos() - self.oldPos)
            self.move(self.x() + delta.x(), self.y() + delta.y())
            self.oldPos = event.globalPos()

    def translate_and_update(self, text, target_lang="EN-US"):
        if self.translator:
            result = self.translator.translate_text(text, target_lang=target_lang)
            self.tgt_label.setText(result.text)

if __name__ == '__main__':
    app = QApplication(sys.argv)
    ex = FreeTalkApp()
    ex.show()
    sys.exit(app.exec_())
