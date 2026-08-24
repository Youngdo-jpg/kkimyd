import io
import os
import sys
import speech_recognition as sr
from dotenv import load_dotenv
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio
from PyQt5.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QSizeGrip, QComboBox, QFrame,
)
from PyQt5.QtCore import Qt, QPoint, QRect, QThread, pyqtSignal
import deepl

# .env 파일에서 DEEPL_API_KEY를 읽어온다 (키를 코드에 직접 적지 않기 위함)
load_dotenv()
DEEPL_API_KEY = os.environ.get("DEEPL_API_KEY", "")

RESIZE_MARGIN = 8
MIN_WIDTH = 480
MIN_HEIGHT = 140

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

# 마이크 음성의 언어를 자동 감지하는 Whisper 모델 설정
# tiny/base/small/medium 순으로 무거워지고 정확해진다.
# GPU가 없는 환경 기준으로, tiny는 정확도가 너무 낮아 small을 기본값으로 사용한다.
# CPU가 느려서 여전히 답답하면 "base"로 낮추고, 반대로 정확도를 더 올리고 싶으면 "medium"을 시도해볼 것.
WHISPER_MODEL_SIZE = "small"
WHISPER_DEVICE = "cpu"
WHISPER_COMPUTE_TYPE = "int8"

# 음성 인식이 고를 수 있는 원문 언어 후보. Whisper는 짧은 발화일수록 전체 99개 언어 중에서
# 음향적으로 비슷한 엉뚱한 언어(예: 한국어 -> 일본어)로 오판하기 쉽다.
# 이 앱은 한국어<->영어 자동 통역이 목적이므로, 후보를 두 언어로 좁혀 오판을 막는다.
SOURCE_LANGUAGE_CANDIDATES = ["ko", "en"]

# 번역 대상 언어 선택 메뉴에 표시할 항목: (표시 이름, DeepL target_lang 코드). 코드가 None이면 자동 모드.
LANGUAGE_OPTIONS = [
    ("자동 (한국어 ⇄ 영어)", None),
    ("한국어", "KO"),
    ("English (US)", "EN-US"),
    ("일본어", "JA"),
    ("중국어(간체)", "ZH"),
    ("프랑스어", "FR"),
    ("독일어", "DE"),
    ("스페인어", "ES"),
    ("이탈리아어", "IT"),
    ("러시아어", "RU"),
]


def target_lang_for(detected_lang):
    # 감지된 언어가 한국어면 영어로, 그 외에는 한국어로 번역
    return "EN-US" if (detected_lang or "").lower() == "ko" else "KO"


class ListenerThread(QThread):
    updated = pyqtSignal(str, str, str)  # 인식된 원문, 번역문, 감지된 언어 코드
    status = pyqtSignal(str)

    def __init__(self, translator, device_index=None, target_lang_override=None):
        super().__init__()
        self.translator = translator
        self.device_index = device_index
        # 메인 스레드에서 언어 선택 메뉴를 바꾸면 이 값을 바로 갱신해 재시작 없이 반영한다.
        self.target_lang_override = target_lang_override
        self.recognizer = sr.Recognizer()
        # 너무 짧으면(0.6초) 문장이 중간에 잘려 인식률이 떨어지고, 너무 길면 반응이 굼떠 보인다.
        # 기본값(0.8초) 근처가 무난하다.
        self.recognizer.pause_threshold = 0.8
        self._running = True
        self._model = None

    def _load_model(self):
        if self._model is None:
            self.status.emit("음성 인식 모델을 불러오는 중입니다...")
            self._model = WhisperModel(
                WHISPER_MODEL_SIZE,
                device=WHISPER_DEVICE,
                compute_type=WHISPER_COMPUTE_TYPE,
                cpu_threads=os.cpu_count() or 4,
            )
        return self._model

    def run(self):
        try:
            model = self._load_model()
        except Exception as e:
            self.status.emit(f"음성 인식 모델 로드 실패: {e}")
            return

        try:
            mic = sr.Microphone(device_index=self.device_index)
        except Exception as e:
            self.status.emit(f"마이크를 찾을 수 없습니다: {e}")
            return

        with mic as source:
            self.recognizer.adjust_for_ambient_noise(source)
            self.status.emit("듣는 중입니다...")
            while self._running:
                try:
                    # timeout을 짧게 둬서 무음 상태에서도 주기적으로 _running 플래그를 확인하게 한다.
                    # (그래야 마이크 전환 시 이전 스레드가 즉시 종료된다.)
                    audio = self.recognizer.listen(source, timeout=1, phrase_time_limit=8)
                except Exception:
                    continue

                try:
                    audio_array = decode_audio(io.BytesIO(audio.get_wav_data()))

                    # 1단계: 전체 99개 언어가 아니라 SOURCE_LANGUAGE_CANDIDATES 안에서만
                    # 확률이 가장 높은 언어를 고른다. (짧은 발화의 언어 오판 방지)
                    _, _, all_probs = model.detect_language(audio=audio_array, vad_filter=True)
                    probs_by_lang = dict(all_probs)
                    detected_lang = max(
                        SOURCE_LANGUAGE_CANDIDATES, key=lambda lang: probs_by_lang.get(lang, 0.0)
                    )

                    # 2단계: 감지된 언어로 고정해서 전사한다 (language=None으로 다시 맡기지 않음).
                    segments, info = model.transcribe(
                        audio_array, language=detected_lang, beam_size=1, vad_filter=True
                    )
                    text = "".join(segment.text for segment in segments).strip()
                except Exception as e:
                    self.status.emit(f"음성 인식 오류: {e}")
                    continue

                if not text:
                    continue

                translated_text = text
                if self.translator:
                    try:
                        target_lang = self.target_lang_override or target_lang_for(detected_lang)
                        translated_text = self.translator.translate_text(
                            text, target_lang=target_lang
                        ).text
                    except Exception as e:
                        translated_text = f"[번역 오류: {e}]"

                self.updated.emit(text, translated_text, detected_lang)

    def stop(self):
        self._running = False


class FreeTalkApp(QWidget):
    def __init__(self):
        super().__init__()
        if not DEEPL_API_KEY:
            print("DEEPL_API_KEY가 설정되지 않았습니다. .env 파일에 키를 추가하세요.")
            self.translator = None
        else:
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

        self.listener = None
        self.start_listener()

    def start_listener(self):
        # 마이크 선택 메뉴가 바뀌었을 때 기존 스레드를 정리하고 새 장치로 다시 시작한다.
        if self.listener is not None:
            self.listener.stop()
            self.listener.wait(2000)

        device_index = self.mic_combo.currentData()
        target_lang = self.lang_combo.currentData()
        self.listener = ListenerThread(
            self.translator, device_index=device_index, target_lang_override=target_lang
        )
        self.listener.updated.connect(self.on_updated)
        self.listener.status.connect(self.on_status)
        self.listener.start()

    def initUI(self):
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setGeometry(100, 100, 760, 190)
        self.setMinimumSize(MIN_WIDTH, MIN_HEIGHT)
        self.setMouseTracking(True)

        layout = QVBoxLayout()
        layout.setContentsMargins(10, 10, 10, 10)

        self.bg_widget = QWidget()
        self.bg_widget.setStyleSheet("background-color: rgba(0, 0, 0, 170); border-radius: 12px;")
        bg_layout = QVBoxLayout(self.bg_widget)

        combo_style = """
            QComboBox {
                color: #E0E0E0;
                background-color: rgba(255, 255, 255, 25);
                border: 1px solid rgba(255, 255, 255, 60);
                border-radius: 6px;
                padding: 3px 6px;
                font-size: 12px;
            }
            QComboBox QAbstractItemView {
                background-color: #222222;
                color: #E0E0E0;
                selection-background-color: #444444;
            }
        """

        self.mic_combo = QComboBox()
        self.mic_combo.setStyleSheet(combo_style)
        self.mic_combo.addItem("시스템 기본 마이크", None)
        try:
            for i, name in enumerate(sr.Microphone.list_microphone_names()):
                self.mic_combo.addItem(name, i)
        except Exception as e:
            print(f"마이크 목록 조회 실패: {e}")
        self.mic_combo.currentIndexChanged.connect(self.on_mic_changed)

        self.lang_combo = QComboBox()
        self.lang_combo.setStyleSheet(combo_style)
        for label, code in LANGUAGE_OPTIONS:
            self.lang_combo.addItem(label, code)
        self.lang_combo.currentIndexChanged.connect(self.on_lang_changed)

        controls_layout = QHBoxLayout()
        controls_layout.addWidget(self.mic_combo, 1)
        controls_layout.addWidget(self.lang_combo, 1)
        bg_layout.addLayout(controls_layout)

        self.src_label = QLabel("인식된 음성이 여기에 표시됩니다.", self)
        self.src_label.setStyleSheet("color: #E0E0E0; font-size: 16px;")
        self.src_label.setWordWrap(True)
        self.src_label.setAlignment(Qt.AlignTop | Qt.AlignLeft)

        divider = QFrame()
        divider.setFrameShape(QFrame.VLine)
        divider.setStyleSheet("color: rgba(255, 255, 255, 60);")

        self.tgt_label = QLabel("Translated text will appear here.", self)
        self.tgt_label.setStyleSheet("color: #FFD700; font-size: 20px; font-weight: bold;")
        self.tgt_label.setWordWrap(True)
        self.tgt_label.setAlignment(Qt.AlignTop | Qt.AlignLeft)

        text_layout = QHBoxLayout()
        text_layout.addWidget(self.src_label, 1)
        text_layout.addWidget(divider)
        text_layout.addWidget(self.tgt_label, 1)
        bg_layout.addLayout(text_layout)

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

    def on_updated(self, source_text, translated_text, detected_lang):
        self.src_label.setText(f"[{detected_lang}] {source_text}")
        self.tgt_label.setText(translated_text)

    def on_status(self, message):
        self.src_label.setText(message)

    def on_mic_changed(self, _index):
        # 마이크 장치는 스레드가 실제로 여는 리소스라 변경 시 스레드를 재시작해야 한다.
        self.start_listener()

    def on_lang_changed(self, _index):
        # 번역 대상 언어는 실행 중인 스레드의 속성만 바꿔주면 다음 문장부터 바로 반영된다.
        if self.listener is not None:
            self.listener.target_lang_override = self.lang_combo.currentData()

    def closeEvent(self, event):
        self.listener.stop()
        self.listener.wait(2000)
        super().closeEvent(event)

if __name__ == '__main__':
    app = QApplication(sys.argv)
    ex = FreeTalkApp()
    ex.show()
    sys.exit(app.exec_())
