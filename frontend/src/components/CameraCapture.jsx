import { useEffect, useRef, useState } from 'react';
import { Camera, X, RotateCcw, Check, AlertCircle } from 'lucide-react';
import Button from './Button';

// Opens the device camera, lets the user capture a still frame, and returns
// a base64 JPEG string via onCapture(photoDataUrl). Used for DTR photo verification.
const CameraCapture = ({ title, onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [captured, setCaptured] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let retryTimer = null;

    const tryStart = async (isRetry = false) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setError('');
      } catch (err) {
        // The camera is very often still releasing from a previous capture
        // (Time In just before Time Out) — a brief automatic retry clears
        // up most of these without the user needing to do anything.
        if (!isRetry && active) {
          retryTimer = setTimeout(() => tryStart(true), 600);
          return;
        }
        if (active) {
          setError('Could not access camera. Please allow camera permissions and try again.');
        }
      }
    };

    tryStart();

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [attempt]);

  const handleTryAgain = () => {
    setError('');
    setAttempt((n) => n + 1);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCaptured(dataUrl);
  };

  const handleRetake = () => {
    setCaptured(null);
    // Re-attach stream to video after retake - fixes black screen on some devices
    setTimeout(() => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(()=>{});
      } else {
        setAttempt(n => n + 1);
      }
    }, 50);
  };

  const handleConfirm = () => {
    onCapture(captured);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-cardHover w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-sti-blue" />
            <h3 className="font-bold text-sti-gray-dark dark:text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="text-sti-gray hover:text-sti-gray-dark dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {error ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
              <Button variant="secondary" icon={RotateCcw} className="w-full" onClick={handleTryAgain}>
                Try Again
              </Button>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
              {!captured ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <img src={captured} alt="Captured verification" className="w-full h-full object-cover" />
              )}
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />

          <div className="mt-5 flex gap-3">
            {!captured ? (
              <Button variant="primary" icon={Camera} className="w-full" onClick={handleCapture} disabled={!!error}>
                Capture Photo
              </Button>
            ) : (
              <>
                <Button variant="secondary" icon={RotateCcw} className="w-1/2" onClick={handleRetake}>
                  Retake
                </Button>
                <Button variant="primary" icon={Check} className="w-1/2" onClick={handleConfirm}>
                  Confirm
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
