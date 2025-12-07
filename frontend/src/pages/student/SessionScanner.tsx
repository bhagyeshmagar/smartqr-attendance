import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader, Result, Exception } from '@zxing/library';
import { attendanceApi, sessionsApi } from '../../api';

export default function SessionScanner() {
    const { id: sessionId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const readerRef = useRef<BrowserMultiFormatReader | null>(null);

    const [isScanning, setIsScanning] = useState(false);
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [phase, setPhase] = useState<string>('');
    const [sessionTitle, setSessionTitle] = useState('');

    useEffect(() => {
        loadSessionDetails();
        return () => stopScanner();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    const loadSessionDetails = async () => {
        if (!sessionId) return;
        try {
            const response = await sessionsApi.getById(sessionId);
            setSessionTitle(response.data.subject?.name || response.data.title);
            setPhase(response.data.phase);
        } catch {
            setMessage('Session not found');
            setStatus('error');
        }
    };

    const startScanner = async () => {
        if (!videoRef.current) return;

        setIsScanning(true);
        setStatus('scanning');
        setMessage('Point your camera at the QR code...');

        readerRef.current = new BrowserMultiFormatReader();
        try {
            await readerRef.current.decodeFromVideoDevice(
                null,
                videoRef.current,
                async (result: Result | null, _error: Exception | undefined) => {
                    if (result) {
                        const token = result.getText();
                        stopScanner();
                        await submitAttendance(token);
                    }
                }
            );
        } catch (err) {
            console.error('Camera error:', err);
            setMessage('Failed to access camera. Please check permissions.');
            setStatus('error');
            setIsScanning(false);
        }
    };

    const stopScanner = () => {
        if (readerRef.current) {
            const reader = readerRef.current as unknown as {
                stopAsyncDecode?: () => void;
                stopContinuousDecode?: () => void;
            };
            reader.stopAsyncDecode?.();
            reader.stopContinuousDecode?.();
            readerRef.current = null;
        }

        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }

        setIsScanning(false);
    };

    const submitAttendance = async (token: string) => {
        try {
            const response = await attendanceApi.scan({ token });
            setStatus('success');
            const data = response.data;

            if (data.phase === 'ENTRY') {
                setMessage(`✓ Entry marked! Come back to scan the exit QR.`);
            } else if (data.phase === 'EXIT') {
                setMessage(`✓ Attendance complete! Both entry and exit recorded.`);
            } else {
                setMessage(data.message || '✓ Attendance marked successfully!');
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setStatus('error');
            setMessage(error.response?.data?.message || 'Failed to mark attendance');
        }
    };

    return (
        <div className="scanner-container">
            <button
                onClick={() => navigate('/student/session')}
                className="btn btn-secondary btn-sm mb-4"
            >
                ← Back to Sessions
            </button>

            <div className="card">
                <div className="card-body">
                    <div className="flex flex-col items-center mb-4">
                        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                            {sessionTitle}
                        </h2>
                        {phase && (
                            <span className={`badge ${phase === 'ENTRY' ? 'badge-active' : 'badge-flagged'}`}>
                                {phase === 'ENTRY' ? '📥 Entry Phase' : '📤 Exit Phase'}
                            </span>
                        )}
                    </div>

                    {/* Video container */}
                    <div className="scanner-preview mb-6">
                        <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            style={{ display: isScanning ? 'block' : 'none' }}
                        />

                        {isScanning && (
                            <div className="scanner-overlay">
                                <div className="scanner-frame" />
                            </div>
                        )}

                        {!isScanning && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                {status === 'idle' && (
                                    <>
                                        <div className="text-4xl mb-2">📷</div>
                                        <p className="text-muted text-sm">Camera permission required to scan QR codes</p>
                                    </>
                                )}
                                {status === 'success' && (
                                    <div className="text-6xl animate-bounce">✅</div>
                                )}
                                {status === 'error' && (
                                    <div className="text-6xl animate-pulse">❌</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Status message */}
                    {message && (
                        <div
                            className="p-4 rounded-xl mb-4 text-center text-sm font-medium border"
                            style={{
                                backgroundColor: status === 'success' ? 'rgba(107,142,35,0.1)' :
                                    status === 'error' ? 'rgba(160,82,45,0.1)' :
                                        'var(--bg-tertiary)',
                                color: status === 'success' ? 'var(--success)' :
                                    status === 'error' ? 'var(--danger)' :
                                        'var(--text-secondary)',
                                borderColor: status === 'success' ? 'var(--success)' :
                                    status === 'error' ? 'var(--danger)' :
                                        'var(--glass-border)'
                            }}
                        >
                            {message}
                        </div>
                    )}

                    {/* Action buttons */}
                    {status === 'idle' && (
                        <button
                            className="btn btn-primary w-full"
                            onClick={startScanner}
                        >
                            Start Scanning
                        </button>
                    )}

                    {status === 'scanning' && (
                        <div>
                            <p className="scanner-hint mb-4">Align the QR code within the frame</p>
                            <button
                                className="btn btn-secondary w-full"
                                onClick={stopScanner}
                            >
                                Stop Scanning
                            </button>
                        </div>
                    )}

                    {(status === 'success' || status === 'error') && (
                        <div className="flex gap-3">
                            <button
                                className="btn btn-primary flex-1"
                                onClick={() => {
                                    setStatus('idle');
                                    setMessage('');
                                    loadSessionDetails();
                                }}
                            >
                                Scan Again
                            </button>
                            <button
                                className="btn btn-secondary flex-1"
                                onClick={() => navigate('/student/session')}
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
