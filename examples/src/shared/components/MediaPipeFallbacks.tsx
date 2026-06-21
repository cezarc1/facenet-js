interface MediaPipeErrorFallbackProps {
  error: unknown;
  resetErrorBoundary: () => void;
}

interface MediaPipeLoadingFallbackProps {
  spinnerColor?: 'primary' | 'accent';
  message?: string;
}

export function MediaPipeErrorFallback({
  error,
  resetErrorBoundary,
}: MediaPipeErrorFallbackProps) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    <div className="demo-page flex items-center justify-center p-4">
      <div className="demo-card max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-[var(--demo-danger)] mb-2">
          MediaPipe Loading Failed
        </h2>
        <p className="demo-subtle mb-4">
          Failed to load MediaPipe models. Please check your internet connection and try again.
        </p>
        <details className="mb-4">
          <summary className="text-sm demo-subtle cursor-pointer">Error Details</summary>
          <pre className="text-xs bg-[var(--demo-surface-muted)] p-2 rounded mt-2 overflow-auto max-h-32">
            {errorMessage}
          </pre>
        </details>
        <button
          onClick={resetErrorBoundary}
          className="demo-button demo-button-danger w-full py-2 px-4"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export function MediaPipeLoadingFallback({
  spinnerColor = 'primary',
  message = 'Downloading vision models (~3MB)...',
}: MediaPipeLoadingFallbackProps) {
  const spinnerClassName =
    spinnerColor === 'accent'
      ? 'animate-spin w-8 h-8 border-4 border-[var(--demo-accent)] border-t-transparent rounded-full mx-auto mb-4'
      : 'animate-spin w-8 h-8 border-4 border-[var(--demo-primary)] border-t-transparent rounded-full mx-auto mb-4';

  return (
    <div className="demo-page flex items-center justify-center p-4">
      <div className="demo-card max-w-md w-full p-6 text-center">
        <div className={spinnerClassName}></div>
        <h2 className="text-lg font-semibold text-[var(--demo-text)] mb-2">Loading MediaPipe</h2>
        <p className="demo-subtle text-sm">{message}</p>
      </div>
    </div>
  );
}
