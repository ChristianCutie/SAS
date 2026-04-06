// src/hooks/useFingerprint.ts
import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import api from "@/services/api";

export type SampleFormat = "Raw" | "Intermediate" | "Compressed" | "PngImage";

export interface FingerprintState {
  isConnected: boolean;
  acquisitionStarted: boolean;
  devices: string[];
  selectedDevice: string;
  currentFormat: SampleFormat;
  quality: string;
  latestImageSrc: string | null;
  latestRawData: string | null;
  latestWsqData: string | null;
  latestIntermediateData: string | null;
  error: string | null;
}

export function useFingerprint() {
  const [state, setState] = useState<FingerprintState>({
    isConnected: false,
    acquisitionStarted: false,
    devices: [],
    selectedDevice: "",
    currentFormat: "Intermediate", // 🔥 force correct format
    quality: "",
    latestImageSrc: null,
    latestRawData: null,
    latestWsqData: null,
    latestIntermediateData: null,
    error: null,
  });

  const sdkRef = useRef<any>(null);

  const updateState = (patch: Partial<FingerprintState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const setError = (msg: string) => {
    console.error(msg);
    updateState({ error: msg });
  };

  const getFormatConstant = (format: SampleFormat): number => {
    const sf = (window as any).Fingerprint.SampleFormat;
    return sf[format];
  };

  // INIT SDK
  useEffect(() => {
    if (!(window as any).Fingerprint) {
      setError("Fingerprint SDK not loaded");
      return;
    }

    const sdk = new (window as any).Fingerprint.WebApi();
    sdkRef.current = sdk;

    sdk.onDeviceConnected = () => updateState({ isConnected: true });
    sdk.onDeviceDisconnected = () =>
      updateState({ isConnected: false, acquisitionStarted: false });

    sdk.onQualityReported = (e: any) => {
      const q = (window as any).Fingerprint.QualityCode[e.quality];
      updateState({ quality: q || "Unknown" });
    };

    sdk.onSamplesAcquired = (s: any) => {
      const samples = JSON.parse(s.samples);

      setState((prev) => {
        if (prev.currentFormat === "PngImage") {
          const b64 = (window as any).Fingerprint.b64UrlTo64(samples[0]);
          return { ...prev, latestImageSrc: `data:image/png;base64,${b64}` };
        }

        if (prev.currentFormat === "Intermediate") {
          const data = (window as any).Fingerprint.b64UrlTo64(samples[0].Data);
          return { ...prev, latestIntermediateData: data };
        }

        return prev;
      });
    };

    // Suppress SDK communication errors - these fire continuously during connection attempts
    sdk.onCommunicationFailed = () => {
      // Silent - errors are reported through try/catch in methods
    };

    return () => {
      if (sdkRef.current) sdkRef.current.stopAcquisition().catch(() => {});
    };
  }, []);

  // METHODS
  const enumerateDevices = useCallback(async () => {
    try {
      if (!sdkRef.current) {
        setError("SDK not initialized");
        return;
      }
      const devices = await sdkRef.current.enumerateDevices();
      updateState({ devices });
      if (devices.length > 0) {
        updateState({ selectedDevice: devices[0] });
        console.log("Devices found:", devices);
      } else {
        setError("No fingerprint devices found. Check USB connection.");
      }
    } catch (err: any) {
      setError("Failed to enumerate devices: " + (err.message || err));
      console.error(err);
    }
  }, []);

  const startCapture = useCallback(async () => {
    try {
      if (!state.selectedDevice) {
        setError("Select device first");
        return;
      }
      if (state.acquisitionStarted) {
        console.log("Acquisition already started");
        return;
      }
      if (!sdkRef.current) {
        setError("SDK not initialized");
        return;
      }

      console.log("Starting capture on device:", state.selectedDevice);
      await sdkRef.current.startAcquisition(
        getFormatConstant(state.currentFormat),
        state.selectedDevice
      );
      updateState({ acquisitionStarted: true, error: null });
      console.log("Capture started successfully");
    } catch (err: any) {
      setError("Failed to start capture: " + (err.message || err));
      console.error("Start capture error:", err);
    }
  }, [state.selectedDevice, state.acquisitionStarted, state.currentFormat]);

  const stopCapture = useCallback(async () => {
    try {
      if (!sdkRef.current) {
        setError("SDK not initialized");
        return;
      }
      if (!state.acquisitionStarted) {
        console.log("No acquisition in progress");
        return;
      }
      await sdkRef.current.stopAcquisition(state.selectedDevice);
      updateState({ acquisitionStarted: false, error: null });
      console.log("Capture stopped");
    } catch (err: any) {
      setError("Failed to stop capture: " + (err.message || err));
      console.error("Stop capture error:", err);
    }
  }, [state.acquisitionStarted, state.selectedDevice]);

  const clearData = useCallback(() => {
    updateState({
      latestImageSrc: null,
      latestIntermediateData: null,
      quality: "",
    });
  }, []);

  // 🔥 SAVE TO BACKEND
  const saveTemplate = useCallback(async (userId: number) => {
    if (!state.latestIntermediateData)
      throw new Error("No fingerprint captured");

    const res = await api.post("/set-fingerprint", {
      user_id: userId,
      fingerprint_id: state.latestIntermediateData,
    });

    return res.data;
  }, [state.latestIntermediateData]);

  return {
    state,
    enumerateDevices,
    startCapture,
    stopCapture,
    clearData,
    saveTemplate,
  };
}