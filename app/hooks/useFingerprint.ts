// src/hooks/useFingerprint.ts
import { useEffect, useRef, useState, useCallback } from "react";
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
  latestRawSample: any | null;
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
    currentFormat: "Intermediate",
    quality: "",
    latestImageSrc: null,
    latestRawData: null,
    latestRawSample: null,
    latestWsqData: null,
    latestIntermediateData: null,
    error: null,
  });

  const sdkRef = useRef<any>(null);
  const enumerateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateState = (patch: Partial<FingerprintState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const setError = (msg: string) => {
    console.warn(msg);
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
      const rawSample = samples[0]; // 🔥 Store raw sample for comparison

      setState((prev) => {
        if (prev.currentFormat === "PngImage") {
          const b64 = (window as any).Fingerprint.b64UrlTo64(samples[0]);
          return {
            ...prev,
            latestImageSrc: `data:image/png;base64,${b64}`,
            latestRawSample: rawSample,
          };
        }

        if (prev.currentFormat === "Intermediate") {
          const data = (window as any).Fingerprint.b64UrlTo64(samples[0].Data);
          return {
            ...prev,
            latestIntermediateData: data,
            latestRawSample: rawSample,
          };
        }

        return prev;
      });
    };

    // Suppress SDK communication errors - these fire continuously during connection attempts
    sdk.onCommunicationFailed = () => {
      // Silent - device is likely disconnected
      console.debug("Fingerprint device communication failed");
    };

    return () => {
      if (sdkRef.current) sdkRef.current.stopAcquisition().catch(() => {});
      if (enumerateTimeoutRef.current)
        clearTimeout(enumerateTimeoutRef.current);
    };
  }, []);

  // METHODS
  const enumerateDevices = useCallback(async (retryCount = 0) => {
    try {
      if (!sdkRef.current) {
        setError("SDK not initialized");
        return;
      }

      // Clear any existing timeout
      if (enumerateTimeoutRef.current) {
        clearTimeout(enumerateTimeoutRef.current);
      }

      // Set timeout for device enumeration (5 seconds)
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Device enumeration timeout"));
        }, 5000);

        enumerateTimeoutRef.current = timeoutId;

        sdkRef.current
          .enumerateDevices()
          .then((devices: string[]) => {
            clearTimeout(timeoutId);
            updateState({ devices });
            if (devices.length > 0) {
              updateState({ selectedDevice: devices[0] });
              console.log("✓ Devices found:", devices);
            } else {
              setError("No fingerprint devices found. Check USB connection.");
            }
            resolve();
          })
          .catch((err: any) => {
            clearTimeout(timeoutId);
            reject(err);
          });
      });
    } catch (err: any) {
      // Retry logic: retry up to 2 times with delay
      if (retryCount < 2) {
        console.warn(
          `Device enumeration failed (attempt ${retryCount + 1}/3). Retrying in 1 second...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return enumerateDevices(retryCount + 1);
      }

      // After retries exhausted, set non-blocking error
      console.warn(
        "Fingerprint device unavailable. Application will work in offline mode.",
      );
      updateState({
        error: null, // Don't show error to user
        devices: [],
        selectedDevice: "",
        acquisitionStarted: false,
      });
    }
  }, []);

  const startCapture = useCallback(async () => {
    try {
      // If no device is selected, silently skip
      if (!state.selectedDevice) {
        console.warn("No fingerprint device selected. Skipping capture.");
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
        state.selectedDevice,
      );
      updateState({ acquisitionStarted: true, error: null });
      console.log("✓ Capture started successfully");
    } catch (err: any) {
      console.warn("Failed to start capture (device may be disconnected)");
      updateState({ acquisitionStarted: false, error: null });
    }
  }, [state.selectedDevice, state.acquisitionStarted, state.currentFormat]);

  const stopCapture = useCallback(async () => {
    try {
      if (!sdkRef.current) {
        updateState({ acquisitionStarted: false, error: null });
        return;
      }
      if (!state.acquisitionStarted) {
        console.log("No acquisition in progress");
        return;
      }
      await sdkRef.current.stopAcquisition(state.selectedDevice);
      updateState({ acquisitionStarted: false, error: null });
      console.log("✓ Capture stopped");
    } catch (err: any) {
      console.warn("Failed to stop capture (device may be disconnected)");
      updateState({ acquisitionStarted: false, error: null });
    }
  }, [state.acquisitionStarted, state.selectedDevice]);

  const clearData = useCallback(() => {
    updateState({
      latestImageSrc: null,
      latestIntermediateData: null,
      latestRawSample: null,
      quality: "",
    });
  }, []);

  // 🔥 SEND RAW SAMPLE TO BACKEND FOR COMPARISON
  const verifyWithBackend = async (students: { student_number: string; fingerprint_template: string }[]) => {
  if (!state.latestIntermediateData) {
    console.error("❌ No fingerprint sample available");
    return null;
  }

  if (!students || students.length === 0) {
    console.error("❌ No student templates loaded");
    return null;
  }

  console.log("📤 Sending fingerprint verification with", {
    sampleLength: state.latestIntermediateData.length,
    templateCount: students.length,
  });

  try {
    const response = await api.post("/verify-fingerprint", {
      fingerprint_sample: state.latestIntermediateData, // send STRING (base64)
      student_templates: students.map(s => ({
        student_number: s.student_number,
        fingerprint_template: s.fingerprint_template,
      })),
    });

    console.log("✅ Verification response:", response.data);
    return response.data.matched_student || null;
  } catch (err: any) {
    console.error("❌ Backend verification error:", err.response?.data || err.message);
    throw err;
  }
};

  // 🔥 SAVE TO BACKEND
 const saveTemplate = async (userId: number) => {
  if (!state.latestIntermediateData) throw new Error("No fingerprint captured");

  const res = await api.post("/set-fingerprint", {
    user_id: userId,
    fingerprint_id: state.latestIntermediateData, // send STRING (base64)
  });

  return res.data;
};

  return {
    state,
    enumerateDevices,
    startCapture,
    stopCapture,
    clearData,
    verifyWithBackend,
    saveTemplate,
  };
}
