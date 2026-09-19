import AVFoundation
import Speech

// Dictation lives in the shell because WKWebView has no SpeechRecognition, and
// because the two things that want the microphone must not compete for it.
//
// One engine, one tap, two sinks: the recognizer gets each buffer for the live
// caption, the file gets the same buffer for the upload. getUserMedia never
// runs in the app, so nothing is fighting over the input.
//
// The caption is decoration. The note still comes from the server's own
// transcript of the uploaded audio, so a word missed here never reaches a
// document used in a dispute — and losing the recording to win a caption would
// be the wrong trade every time.
final class MarketelDictation {
    private let engine = AVAudioEngine()
    private var recognizer: SFSpeechRecognizer?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var file: AVAudioFile?
    private var fileURL: URL?
    private var onText: ((String) -> Void)?
    private var onFinish: ((String?) -> Void)?
    private var settled = false

    var isRunning: Bool { engine.isRunning }

    func start(onText: @escaping (String) -> Void, onFinish: @escaping (String?) -> Void) {
        guard !engine.isRunning else { return }
        self.onText = onText
        self.onFinish = onFinish
        settled = false
        // The microphone is required; speech recognition is not. Denying speech
        // costs the captions and nothing else.
        AVAudioApplication.requestRecordPermission { [weak self] microphone in
            guard microphone else {
                DispatchQueue.main.async { self?.settle(nil) }
                return
            }
            SFSpeechRecognizer.requestAuthorization { status in
                DispatchQueue.main.async { self?.begin(captions: status == .authorized) }
            }
        }
    }

    private func begin(captions: Bool) {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: [.duckOthers])
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let input = engine.inputNode
            let format = input.outputFormat(forBus: 0)
            guard format.sampleRate > 0 else { settle(nil); return }

            // m4a because the upload route already accepts audio/m4a, and the
            // channel count is taken from the tap so writing never mismatches.
            let target = FileManager.default.temporaryDirectory
                .appendingPathComponent("inspect-note-\(UUID().uuidString).m4a")
            fileURL = target
            file = try AVAudioFile(forWriting: target, settings: [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: format.sampleRate,
                AVNumberOfChannelsKey: format.channelCount,
                AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue,
            ])

            if captions, let speech = SFSpeechRecognizer(), speech.isAvailable {
                recognizer = speech
                let live = SFSpeechAudioBufferRecognitionRequest()
                live.shouldReportPartialResults = true
                // Keep the audio on the device wherever the hardware allows it,
                // so a walkthrough is not shipped to a second processor purely
                // to draw text on screen.
                if speech.supportsOnDeviceRecognition { live.requiresOnDeviceRecognition = true }
                request = live
                task = speech.recognitionTask(with: live) { [weak self] result, _ in
                    guard let text = result?.bestTranscription.formattedString, !text.isEmpty else { return }
                    DispatchQueue.main.async { self?.onText?(text) }
                }
            }

            input.installTap(onBus: 0, bufferSize: 2048, format: format) { [weak self] buffer, _ in
                self?.request?.append(buffer)
                try? self?.file?.write(from: buffer)
            }
            engine.prepare()
            try engine.start()
        } catch {
            teardown()
            settle(nil)
        }
    }

    func stop() {
        guard !settled else { return }
        guard engine.isRunning else { settle(nil); return }
        teardown()
        let written = fileURL
        fileURL = nil
        guard let written, let data = try? Data(contentsOf: written), !data.isEmpty else {
            settle(nil)
            return
        }
        try? FileManager.default.removeItem(at: written)
        settle("data:audio/m4a;base64,\(data.base64EncodedString())")
    }

    private func teardown() {
        if engine.isRunning { engine.inputNode.removeTap(onBus: 0) }
        engine.stop()
        request?.endAudio()
        task?.cancel()
        task = nil
        request = nil
        recognizer = nil
        // Releasing the handle is what flushes and closes the file.
        file = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private func settle(_ dataUrl: String?) {
        guard !settled else { return }
        settled = true
        let finish = onFinish
        onText = nil
        onFinish = nil
        finish?(dataUrl)
    }
}
