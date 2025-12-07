import { useLocation, useNavigate } from 'react-router-dom';

interface LocationState {
    success: boolean;
    message: string;
    flagged?: boolean;
}

export default function Confirmation() {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as LocationState | null;

    if (!state) {
        navigate('/student/scan');
        return null;
    }

    const getIconClass = () => {
        if (state.flagged) return 'confirmation-icon warning';
        return state.success ? 'confirmation-icon success' : 'confirmation-icon error';
    };

    const getIcon = () => {
        if (state.flagged) return '⚠️';
        return state.success ? '✓' : '✕';
    };

    const getTitle = () => {
        if (state.flagged) return 'Attendance Recorded';
        return state.success ? 'Success!' : 'Failed';
    };

    return (
        <div className="confirmation">
            <div className={getIconClass()}>
                {getIcon()}
            </div>

            <h1 className="confirmation-title">{getTitle()}</h1>
            <p className="confirmation-message">{state.message}</p>

            {state.flagged && (
                <div className="card mb-4" style={{ textAlign: 'left' }}>
                    <div className="card-body">
                        <p style={{ color: 'var(--warning)', fontWeight: 500 }}>
                            ⚠️ Your attendance has been flagged for review
                        </p>
                        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            This may happen if the system detects unusual activity.
                            Your attendance is still recorded but may be reviewed by an administrator.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex gap-2" style={{ justifyContent: 'center' }}>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/student/scan')}
                >
                    Scan Another
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={() => navigate('/student/attendance')}
                >
                    View History
                </button>
            </div>
        </div>
    );
}
