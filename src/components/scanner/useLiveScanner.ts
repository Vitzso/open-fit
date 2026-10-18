"use client";
// Live camera scanning: opens the rear camera, decodes continuously, handles
// the torch, and pauses when the app is in the background.
import { useCallback, useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { createBarcodeReader, describeCameraError } from "@/lib/barcode-reader";

export type ScanStatus = "idle" | "starting" | "scanning" | "error";

const IDEAL: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
};
const FALLBACK: MediaStreamConstraints = { audio: false, video: { facingMode: "environment" } };

/** True when this browser can show a live camera feed (needs HTTPS). */
const canUseLiveCamera = () =>
  typeof window !== "undefined" && window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === "function";

/**
 * Runs the live scanner on `videoRef`. `onText` gets each decoded value and
 * returns true when it was accepted (which stops the camera).
 */
export function useLiveScanner(videoRef: React.RefObject<HTMLVideoElement | null>, onText: (text: string) => boolean) {
  const controlsRef = useRef<IScannerControls | null>(null);
  const acceptedRef = useRef(false);
  // Latest callback in a ref so a new `onText` doesn't restart the camera.
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  // Bumped on every start/stop so a camera that finishes opening after we've
  // already stopped (React strict mode, fast navigation) is closed immediately.
  const genRef = useRef(0);

  const [status, setStatus] = useState<ScanStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  /** Closes the camera. */
  const stop = useCallback(() => {
    genRef.current++;
    controlsRef.current?.stop();
    controlsRef.current = null;
    setTorchOn(false);
  }, []);

  /** Passes decoded text on; stops scanning once it's accepted. */
  const handle = useCallback(
    (text: string) => {
      if (acceptedRef.current || !onTextRef.current(text)) return;
      acceptedRef.current = true;
      stop();
    },
    [stop],
  );

  /** Opens the camera and starts decoding (retries with looser constraints if needed). */
  const start = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const gen = ++genRef.current;
    acceptedRef.current = false;
    setError(null);
    setStatus("starting");
    // iOS needs these set as properties *before* the stream is attached.
    video.muted = true;
    video.setAttribute("playsinline", "true");
    try {
      const reader = await createBarcodeReader(false);
      const run = (c: MediaStreamConstraints) => reader.decodeFromConstraints(c, video, (result) => result && handle(result.getText()));
      const controls = await run(IDEAL).catch((e: Error) => {
        // Some devices reject the ideal resolution: retry with anything.
        if (e.name !== "OverconstrainedError") throw e;
        return run(FALLBACK);
      });
      if (gen !== genRef.current) return controls.stop();
      controlsRef.current = controls;
      setHasTorch(typeof controls.switchTorch === "function");
      setStatus("scanning");
    } catch (e) {
      if (gen !== genRef.current) return;
      setStatus("error");
      setError(describeCameraError(e));
    }
  }, [handle, videoRef]);

  useEffect(() => {
    const ok = canUseLiveCamera();
    setSupported(ok);
    if (ok) void start();
    return stop;
  }, [start, stop]);

  // Pause the camera when the app is backgrounded (saves battery, releases the camera on iOS).
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) stop();
      else if (supported && !acceptedRef.current && !controlsRef.current) void start();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [supported, start, stop]);

  /** Turns the flashlight on or off (hides the button if the device refuses). */
  async function toggleTorch() {
    const c = controlsRef.current;
    if (!c?.switchTorch) return;
    try {
      await c.switchTorch(!torchOn);
      setTorchOn(!torchOn);
    } catch {
      setHasTorch(false);
    }
  }

  return { status, error, supported, hasTorch, torchOn, start, stop, toggleTorch };
}
