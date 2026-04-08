import { useEffect, useState } from "react";
import { useFingerprint } from "@/hooks/useFingerprint";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const FingerprintScanner = () => {
  const {
    state,
    enumerateDevices,
    startCapture,
    stopCapture,
    clearData,
    saveTemplate,
  } = useFingerprint();

  const [saving, setSaving] = useState(false);
  const [enumerating, setEnumerating] = useState(false);

  useEffect(() => {
    const init = async () => {
      setEnumerating(true);
      try {
        await enumerateDevices();
      } catch (err) {
        console.error("Failed to enumerate devices on mount:", err);
      } finally {
        setEnumerating(false);
      }
    };
    init();
  }, [enumerateDevices]);

  const handleSave = async () => {
    if (!state.latestIntermediateData) {
      alert("Scan fingerprint first!");
      return;
    }

    setSaving(true);
    try {
      const res = await saveTemplate(1);
      alert(res.message);
    } catch (e) {
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-gray-900">Fingerprint Scanner</h1>
          <p className="text-gray-600 mt-2">Capture and manage fingerprint biometrics</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {state.error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription className="font-semibold">{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Info & Status */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                <h2 className="text-lg font-semibold text-blue-900">Device Status</h2>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Connection Status</p>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        state.isConnected ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <span
                      className={`font-semibold ${
                        state.isConnected ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {state.isConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium text-gray-600 mb-1">Scan Quality</p>
                  <p className="text-lg font-semibold text-gray-900">{state.quality || "N/A"}</p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium text-gray-600 mb-1">Acquisition Status</p>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        state.acquisitionStarted ? "bg-yellow-500 animate-pulse" : "bg-gray-400"
                      }`}
                    />
                    <span className="font-semibold text-gray-900">
                      {state.acquisitionStarted ? "Active" : "Idle"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Controls Card */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                <h2 className="text-lg font-semibold text-purple-900">Controls</h2>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <Button
                  onClick={startCapture}
                  disabled={!state.selectedDevice || state.acquisitionStarted}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2"
                >
                  Start Capture
                </Button>
                <Button
                  onClick={stopCapture}
                  disabled={!state.acquisitionStarted}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2"
                  variant="outline"
                >
                  Stop Capture
                </Button>
                <Button
                  onClick={clearData}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2"
                  variant="outline"
                >
                  Clear Data
                </Button>
                <Button
                  onClick={async () => {
                    setEnumerating(true);
                    try {
                      await enumerateDevices();
                    } finally {
                      setEnumerating(false);
                    }
                  }}
                  disabled={enumerating}
                  className="w-full"
                  variant="outline"
                >
                  {enumerating ? "Scanning..." : "Rescan Devices"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Content - Preview & Save */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preview Card */}
            {state.latestImageSrc && (
              <Card>
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100">
                  <h2 className="text-lg font-semibold text-indigo-900">Fingerprint Preview</h2>
                </CardHeader>
                <CardContent className="pt-6 flex justify-center items-center bg-gray-50 rounded-lg p-8">
                  <img
                    src={state.latestImageSrc}
                    alt="Fingerprint"
                    className="max-w-sm rounded-lg shadow-lg border-4 border-gray-300"
                  />
                </CardContent>
              </Card>
            )}

            {/* Save Card */}
            {state.latestIntermediateData && (
              <Card className="border-2 border-green-200 bg-green-50">
                <CardHeader className="bg-gradient-to-r from-green-100 to-green-200">
                  <h2 className="text-lg font-semibold text-green-900">Save Fingerprint</h2>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Ready to save the captured fingerprint to the database.
                  </p>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-lg"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      "Save to Database"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!state.latestImageSrc && (
              <Card className="border-dashed border-2">
                <CardContent className="pt-12 pb-12 text-center">
                  <div className="text-6xl mb-4">👆</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Fingerprint Captured Yet</h3>
                  <p className="text-gray-500">
                    {!state.selectedDevice
                      ? "Select a device and click 'Start Capture' to begin scanning"
                      : "Position your finger on the scanner to capture a fingerprint"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};