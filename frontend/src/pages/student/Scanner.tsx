import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Result, Exception } from '@zxing/library';
import { attendanceApi } from '../../api';

export default function Scanner() {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [hasCamera, setHasCamera] = useState(true);
    const [manualToken, setManualToken] = useState('');
    const readerRef = useRef<BrowserMultiFormatReader | null>(null);

    useEffect(() => {
        startScanner();

        return () => {
            stopScanner();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startScanner = async () => {
        try {
            const reader = new BrowserMultiFormatReader();
            readerRef.current = reader;

            const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();

            if (videoInputDevices.length === 0) {
                setHasCamera(false);
                return;
            }

            setIsScanning(true);

            const selectedDeviceId = videoInputDevices[0].deviceId;

            await reader.decodeFromVideoDevice(
                selectedDeviceId,
                videoRef.current!,
                async (result: Result | undefined, _error: Exception | undefined) => {
                    if (result) {
                        const token = result.getText();
                        stopScanner();
                        await handleScan(token);
                    }
                }
            );
        } catch (err) {
            console.error('Scanner error:', err);
            setHasCamera(false);
            setError('Failed to access camera. Please allow camera permissions.');
        }
    };

    const stopScanner = () => {
        // Stop the zxing reader
        if (readerRef.current) {
            const reader = readerRef.current as unknown as {
                stopAsyncDecode?: () => void;
                stopContinuousDecode?: () => void;
            };
            reader.stopAsyncDecode?.();
            reader.stopContinuousDecode?.();
            readerRef.current = null;
        }

        // Stop all video tracks to turn off the camera
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }

        setIsScanning(false);
    };

    const handleScan = async (token: string) => {
        if (!token) return;

        try {
            const deviceFp = generateDeviceFingerprint();

            const response = await attendanceApi.scan({
                token,
                deviceFp,
                geo: undefined, // Could add geolocation here if permitted
            });

            navigate('/student/confirmation', {
                state: {
                    success: true,
                    message: response.data.message,
                    flagged: response.data.attendance?.verificationFlags?.flagged,
                },
            });
        } catch (err: unknown) {
            const error = err as { response?: { status?: number; data?: { message?: string } } };
            let message = 'Failed to mark attendance';

            if (error.response?.status === 409) {
                message = 'Attendance already marked for this session';
            } else if (error.response?.status === 400) {
                message = error.response?.data?.message || 'Invalid or expired QR code';
            }

            navigate('/student/confirmation', {
                state: {
                    success: false,
                    message,
                },
            });
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (manualToken.trim()) {
            await handleScan(manualToken.trim());
        }
    };

    const generateDeviceFingerprint = (): string => {
        const data = [
            navigator.userAgent,
            screen.width,
            screen.height,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            navigator.language,
        ].join('|');

        // Simple hash
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return `fp_${Math.abs(hash).toString(16)}`;
    };

    return (
        <div className="scanner-container">
            <h1 className="page-title text-center mb-4">Scan QR Code</h1>

            {error && <div className="form-error text-center mb-4">{error}</div>}

            {hasCamera ? (
                <>
                    <div className="scanner-preview">
                        <video ref={videoRef} autoPlay playsInline muted />
                        <div className="scanner-overlay">
                            <div className="scanner-frame" />
                        </div>
                    </div>

                    <p className="scanner-hint">
                        {isScanning ? 'Point your camera at the QR code' : 'Starting camera...'}
                    </p>

                    <div className="mt-4">
                        <button className="btn btn-secondary" onClick={() => startScanner()}>
                            Restart Scanner
                        </button>
                    </div>
                </>
            ) : (
                <div className="card">
                    <div className="card-body">
                        <p className="text-center text-muted mb-4">
                            Camera not available. Enter the token manually:
                        </p>
                        <form onSubmit={handleManualSubmit}>
                            <div className="form-group">
                                <input
                                    type="text"
                                    className="form-input"
                                    value={manualToken}
                                    onChange={(e) => setManualToken(e.target.value)}
                                    placeholder="Paste QR token here"
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                Submit
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="text-center mt-6">
                <p className="text-muted" style={{ fontSize: '0.8125rem' }}>
                    Make sure you're in the same room as the instructor.
                    <br />
                    QR codes rotate every 30 seconds.
                </p>
            </div>
        </div>
    );
}
