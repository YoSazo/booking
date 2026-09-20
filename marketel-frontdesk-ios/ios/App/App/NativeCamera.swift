import AVFoundation
import UIKit

// A half-sheet camera, so photographing a room never leaves the report.
//
// This is native rather than a web viewfinder on purpose: iOS caps
// getUserMedia at 720p inside a WKWebView and offers no ImageCapture, which
// would put every photo below the 1600px the upload pipeline already keeps —
// on a document whose whole job is proving condition.
final class MarketelInspectCameraViewController: UIViewController {
    private let onCapture: (String, Int) -> Void
    private let onDismiss: () -> Void
    // Read at capture time, not bound at present time.
    var room: Int { didSet { if room != oldValue { updateMessage() } } }
    var roomName: String = "" { didSet { updateMessage() } }
    private let session = AVCaptureSession()
    private let output = AVCapturePhotoOutput()
    private let sessionQueue = DispatchQueue(label: "com.bookmarketel.inspect.camera")
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private let previewContainer = UIView()
    private let strip = UIStackView()
    private let stripScroll = UIScrollView()
    private let shutter = UIButton(type: .custom)
    private let message = UILabel()
    private var captured = 0

    init(room: Int, onCapture: @escaping (String, Int) -> Void, onDismiss: @escaping () -> Void) {
        self.room = room
        self.onCapture = onCapture
        self.onDismiss = onDismiss
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.05, green: 0.08, blue: 0.06, alpha: 1)
        buildInterface()
        requestAccess()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = previewContainer.bounds
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        sessionQueue.async { [session] in
            if session.isRunning { session.stopRunning() }
        }
        if isBeingDismissed { onDismiss() }
    }

    // Says where the next shot lands, because the room can now be changed
    // from the list showing above the sheet while this stays open.
    private func updateMessage() {
        let name = roomName.trimmingCharacters(in: .whitespacesAndNewlines)
        message.text = name.isEmpty
            ? "Photos are added to this room as you take them."
            : "Photos are being added to \(name)."
    }

    private func buildInterface() {
        // The viewfinder is the sheet. Controls float over it, the way every
        // camera does — giving the preview a leftover slice left it postage
        // stamp sized at the medium detent.
        previewContainer.backgroundColor = .black
        previewContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(previewContainer)

        let done = UIButton(type: .system)
        done.setTitle("Done", for: .normal)
        done.setTitleColor(.white, for: .normal)
        done.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
        done.titleLabel?.layer.shadowColor = UIColor.black.cgColor
        done.titleLabel?.layer.shadowOpacity = 0.6
        done.titleLabel?.layer.shadowRadius = 3
        done.titleLabel?.layer.shadowOffset = .zero
        done.addTarget(self, action: #selector(finish), for: .touchUpInside)

        message.textColor = .white
        message.font = .systemFont(ofSize: 13, weight: .medium)
        message.textAlignment = .center
        message.numberOfLines = 2
        message.text = "Photos are added to this room as you take them."
        message.layer.shadowColor = UIColor.black.cgColor
        message.layer.shadowOpacity = 0.5
        message.layer.shadowRadius = 3
        message.layer.shadowOffset = .zero

        strip.axis = .horizontal
        strip.spacing = 8
        strip.alignment = .center
        stripScroll.showsHorizontalScrollIndicator = false
        stripScroll.addSubview(strip)

        shutter.backgroundColor = .white
        shutter.layer.cornerRadius = 33
        shutter.layer.borderWidth = 4
        shutter.layer.borderColor = UIColor.white.withAlphaComponent(0.4).cgColor
        shutter.addTarget(self, action: #selector(capture), for: .touchUpInside)
        shutter.isEnabled = false

        for subview in [done, stripScroll, shutter, message] {
            subview.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(subview)
        }
        strip.translatesAutoresizingMaskIntoConstraints = false

        NSLayoutConstraint.activate([
            previewContainer.topAnchor.constraint(equalTo: view.topAnchor),
            previewContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            previewContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            previewContainer.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            done.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 4),
            done.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -18),

            stripScroll.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 14),
            stripScroll.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -14),
            stripScroll.heightAnchor.constraint(equalToConstant: 48),
            stripScroll.bottomAnchor.constraint(equalTo: shutter.topAnchor, constant: -10),

            strip.topAnchor.constraint(equalTo: stripScroll.topAnchor),
            strip.bottomAnchor.constraint(equalTo: stripScroll.bottomAnchor),
            strip.leadingAnchor.constraint(equalTo: stripScroll.leadingAnchor),
            strip.trailingAnchor.constraint(equalTo: stripScroll.trailingAnchor),
            strip.heightAnchor.constraint(equalTo: stripScroll.heightAnchor),

            shutter.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            shutter.widthAnchor.constraint(equalToConstant: 66),
            shutter.heightAnchor.constraint(equalToConstant: 66),
            shutter.bottomAnchor.constraint(equalTo: message.topAnchor, constant: -8),

            message.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            message.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
            message.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -8),
        ])
    }

    private func requestAccess() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            configureSession()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    granted ? self?.configureSession() : self?.refuse()
                }
            }
        default:
            refuse()
        }
    }

    private func refuse() {
        message.text = "Camera access is off for Marketel. Turn it on in Settings, or use Add photos instead."
        shutter.isEnabled = false
        shutter.alpha = 0.4
    }

    private func configureSession() {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            self.session.beginConfiguration()
            self.session.sessionPreset = .photo
            guard
                let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
                let input = try? AVCaptureDeviceInput(device: device),
                self.session.canAddInput(input),
                self.session.canAddOutput(self.output)
            else {
                self.session.commitConfiguration()
                DispatchQueue.main.async { self.refuse() }
                return
            }
            self.session.addInput(input)
            self.session.addOutput(self.output)
            self.session.commitConfiguration()
            self.session.startRunning()
            DispatchQueue.main.async { self.attachPreview() }
        }
    }

    private func attachPreview() {
        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        layer.frame = previewContainer.bounds
        previewContainer.layer.insertSublayer(layer, at: 0)
        previewLayer = layer
        shutter.isEnabled = true
    }

    @objc private func capture() {
        guard shutter.isEnabled else { return }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        sessionQueue.async { [weak self] in
            guard let self else { return }
            self.output.capturePhoto(with: AVCapturePhotoSettings(), delegate: self)
        }
    }

    @objc private func finish() {
        dismiss(animated: true)
    }

    private func addThumbnail(_ image: UIImage) {
        let tile = UIImageView(image: image)
        tile.contentMode = .scaleAspectFill
        tile.clipsToBounds = true
        tile.layer.cornerRadius = 8
        tile.translatesAutoresizingMaskIntoConstraints = false
        tile.widthAnchor.constraint(equalToConstant: 48).isActive = true
        tile.heightAnchor.constraint(equalToConstant: 48).isActive = true
        strip.addArrangedSubview(tile)
        captured += 1
        message.text = captured == 1 ? "1 photo added to this room." : "\(captured) photos added to this room."
        DispatchQueue.main.async { [stripScroll, strip] in
            let right = max(0, strip.bounds.width - stripScroll.bounds.width)
            stripScroll.setContentOffset(CGPoint(x: right, y: 0), animated: true)
        }
    }

    // Matched to the server's own resize so nothing is sent that would only be
    // thrown away, and so the bridge payload stays a few hundred kilobytes.
    private func encode(_ image: UIImage) -> String? {
        let limit: CGFloat = 1600
        let longest = max(image.size.width, image.size.height)
        let scale = longest > limit ? limit / longest : 1
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let resized = UIGraphicsImageRenderer(size: size, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
        guard let data = resized.jpegData(compressionQuality: 0.8) else { return nil }
        return "data:image/jpeg;base64,\(data.base64EncodedString())"
    }
}

extension MarketelInspectCameraViewController: AVCapturePhotoCaptureDelegate {
    func photoOutput(
        _ output: AVCapturePhotoOutput,
        didFinishProcessingPhoto photo: AVCapturePhoto,
        error: Error?
    ) {
        guard
            error == nil,
            let data = photo.fileDataRepresentation(),
            let image = UIImage(data: data)
        else {
            DispatchQueue.main.async { [weak self] in
                self?.message.text = "That photo did not save. Try again."
            }
            return
        }
        guard let encoded = encode(image) else { return }
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.addThumbnail(image)
            self.onCapture(encoded, self.room)
        }
    }
}
