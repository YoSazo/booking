import AVFoundation
import UIKit

// A half-sheet camera, so photographing a room never leaves the report.
//
// One control does both jobs. A tap on the shutter is a photo, taken the
// moment the finger lands. Holding it talks: the shell records while it is held,
// so a finding is one gesture, a photo and the words that go with it.
//
// This is native rather than a web viewfinder on purpose: iOS caps
// getUserMedia at 720p inside a WKWebView and offers no ImageCapture, which
// would put every photo below the 1600px the upload pipeline already keeps —
// on a document whose whole job is proving condition.
final class MarketelInspectCameraViewController: UIViewController {
    private let onCapture: (String, Int) -> Void
    private let onDismiss: () -> Void
    // Told when a hold on the shutter begins (true) and ends (false). The shell
    // owns the recorder; this only says when.
    var onHold: ((Bool) -> Void)?
    // Read at capture time, not bound at present time.
    var room: Int
    private let session = AVCaptureSession()
    private let output = AVCapturePhotoOutput()
    private let sessionQueue = DispatchQueue(label: "com.bookmarketel.inspect.camera")
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private let previewContainer = UIView()
    private let strip = UIStackView()
    private let stripScroll = UIScrollView()
    private let shutter = UIButton(type: .custom)
    private let message = UILabel()
    private let flash = UIView()
    // The one instruction on this screen.
    private let hint = "Tap for a photo · hold to talk"
    private var pressing = false
    private var holding = false
    private var holdTimer: Timer?

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
        // A recording must never outlive the screen it belongs to.
        holdTimer?.invalidate()
        holdTimer = nil
        pressing = false
        if holding { endHold() }
        sessionQueue.async { [session] in
            if session.isRunning { session.stopRunning() }
        }
        if isBeingDismissed { onDismiss() }
    }

    private func updateMessage() {
        message.text = holding ? "Listening…" : hint
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
        message.text = hint
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
        // The photo is taken at touch-down; a finger still down a moment later
        // is a hold, and talks until it lifts.
        shutter.addTarget(self, action: #selector(pressBegan), for: .touchDown)
        for event: UIControl.Event in [.touchUpInside, .touchUpOutside, .touchCancel] {
            shutter.addTarget(self, action: #selector(pressEnded), for: event)
        }
        shutter.isAccessibilityElement = true
        shutter.accessibilityLabel = "Take photo"
        shutter.accessibilityHint = "Hold to record a voice note."
        shutter.isEnabled = false

        // A white blink over the viewfinder on every shot, under the controls.
        flash.backgroundColor = .white
        flash.alpha = 0
        flash.isUserInteractionEnabled = false
        flash.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(flash)

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

            flash.topAnchor.constraint(equalTo: view.topAnchor),
            flash.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            flash.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            flash.bottomAnchor.constraint(equalTo: view.bottomAnchor),

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

    @objc private func pressBegan() {
        guard shutter.isEnabled, !pressing else { return }
        pressing = true
        UIView.animate(withDuration: 0.12, delay: 0, options: [.curveEaseOut, .allowUserInteraction]) {
            self.shutter.transform = CGAffineTransform(scaleX: 0.9, y: 0.9)
        }
        takePhoto()
        holdTimer?.invalidate()
        holdTimer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: false) { [weak self] _ in
            self?.beginHold()
        }
    }

    @objc private func pressEnded() {
        guard pressing else { return }
        pressing = false
        holdTimer?.invalidate()
        holdTimer = nil
        if holding { endHold() }
        settleShutter()
    }

    private func takePhoto() {
        guard shutter.isEnabled else { return }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        flash.layer.removeAllAnimations()
        flash.alpha = 0.55
        UIView.animate(withDuration: 0.24, delay: 0, options: [.curveEaseOut, .allowUserInteraction]) {
            self.flash.alpha = 0
        }
        sessionQueue.async { [weak self] in
            guard let self else { return }
            self.output.capturePhoto(with: AVCapturePhotoSettings(), delegate: self)
        }
    }

    private func beginHold() {
        holdTimer = nil
        guard pressing, !holding else { return }
        holding = true
        UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
        updateMessage()
        UIView.animate(withDuration: 0.2, delay: 0, options: [.curveEaseOut, .allowUserInteraction], animations: {
            self.shutter.transform = CGAffineTransform(scaleX: 1.14, y: 1.14)
            self.shutter.backgroundColor = UIColor(red: 0.85, green: 0.22, blue: 0.18, alpha: 1)
        }, completion: { _ in
            guard self.holding else { return }
            UIView.animate(withDuration: 0.8, delay: 0, options: [.autoreverse, .repeat, .allowUserInteraction, .curveEaseInOut]) {
                self.shutter.transform = CGAffineTransform(scaleX: 1.22, y: 1.22)
            }
        })
        onHold?(true)
    }

    private func endHold() {
        guard holding else { return }
        holding = false
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        updateMessage()
        onHold?(false)
    }

    private func settleShutter() {
        shutter.layer.removeAllAnimations()
        UIView.animate(withDuration: 0.34, delay: 0, usingSpringWithDamping: 0.6, initialSpringVelocity: 0.8, options: [.allowUserInteraction]) {
            self.shutter.transform = .identity
            self.shutter.backgroundColor = .white
        }
    }

    @objc private func finish() {
        dismiss(animated: true)
    }

    // The photo you just took flies from the shutter into the strip and lands
    // there, so a shot taken is a shot seen. The tile is in place from the
    // start, hidden, so the strip never jumps when it arrives.
    private func addThumbnail(_ image: UIImage) {
        let tile = UIImageView(image: image)
        tile.contentMode = .scaleAspectFill
        tile.clipsToBounds = true
        tile.layer.cornerRadius = 8
        tile.alpha = 0
        tile.translatesAutoresizingMaskIntoConstraints = false
        tile.widthAnchor.constraint(equalToConstant: 48).isActive = true
        tile.heightAnchor.constraint(equalToConstant: 48).isActive = true
        strip.addArrangedSubview(tile)

        view.layoutIfNeeded()
        let right = max(0, strip.bounds.width - stripScroll.bounds.width)
        stripScroll.setContentOffset(CGPoint(x: right, y: 0), animated: false)
        view.layoutIfNeeded()

        let flyer = UIImageView(image: image)
        flyer.contentMode = .scaleAspectFill
        flyer.clipsToBounds = true
        flyer.layer.cornerRadius = 33
        flyer.frame = CGRect(x: shutter.center.x - 33, y: shutter.center.y - 33, width: 66, height: 66)
        view.addSubview(flyer)

        let landing = tile.convert(tile.bounds, to: view)
        let arrive = {
            tile.alpha = 1
            flyer.removeFromSuperview()
        }
        UIView.animate(withDuration: 0.46, delay: 0, usingSpringWithDamping: 0.78, initialSpringVelocity: 0.5, options: [.curveEaseOut], animations: {
            flyer.frame = landing
            flyer.layer.cornerRadius = 8
        }, completion: { _ in arrive() })
        // If anything interrupts the flight, the photo still shows.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) { arrive() }
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
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) { self?.updateMessage() }
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
