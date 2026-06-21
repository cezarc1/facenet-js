import { lazy, Suspense, useState, useTransition } from 'react';
import { GitHubStats } from './shared/components/GitHubStats';

type DemoMode = 'face-comparison' | 'photo-clustering';

const FaceComparisonDemo = lazy(() => import('./features/face-detection/FaceComparisonDemo'));
const FaceClusteringDemo = lazy(() => import('./features/face-clustering/FaceClusteringDemo'));

const demoLabels: Record<DemoMode, string> = {
  'face-comparison': 'Face Comparison',
  'photo-clustering': 'Face Clustering',
};

const DemoLoadingFallback = ({ mode }: { mode: DemoMode }) => (
  <div className="flex min-h-[50vh] items-center justify-center px-4">
    <div
      role="status"
      className="demo-card px-5 py-4 text-sm font-medium demo-subtle"
    >
      Loading {demoLabels[mode]}...
    </div>
  </div>
);

export const App = () => {
  const [mode, setMode] = useState<DemoMode>('face-comparison');
  const [isPending, startTransition] = useTransition();

  const selectMode = (nextMode: DemoMode) => {
    startTransition(() => {
      setMode(nextMode);
    });
  };

  return (
    <div className="demo-page">
      <nav className="fixed inset-x-0 top-3 z-50 px-3 pointer-events-none sm:px-4" aria-label="FaceNet demo sections">
        <div className="mx-auto max-w-7xl pointer-events-auto">
          <div className="demo-card grid grid-cols-1 gap-3 bg-white/95 px-3 py-3 backdrop-blur sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="hidden sm:block" aria-hidden="true" />
            <div className="demo-segmented mx-auto flex w-full max-w-md items-center gap-1 p-1 sm:w-auto">
              <button
                onClick={() => selectMode('face-comparison')}
                className={`demo-tab flex-1 whitespace-nowrap px-3 py-2 text-sm transition-all sm:flex-none sm:px-4 sm:text-base ${mode === 'face-comparison'
                  ? 'demo-tab-primary-active'
                  : ''
                  }`}
              >
                Face Comparison
              </button>
              <button
                onClick={() => selectMode('photo-clustering')}
                className={`demo-tab flex-1 whitespace-nowrap px-3 py-2 text-sm transition-all sm:flex-none sm:px-4 sm:text-base ${mode === 'photo-clustering'
                  ? 'demo-tab-accent-active'
                  : ''
                  }`}
              >
                Face Clustering
              </button>
            </div>
            <div className="hidden justify-self-end lg:flex">
              <GitHubStats owner="cezarc1" repo="facenet-js" />
            </div>
          </div>
          {isPending && (
            <div
              role="status"
              aria-live="polite"
              className="mx-auto mt-2 w-fit rounded-full bg-[var(--demo-text)] px-3 py-1 text-xs font-medium text-white shadow demo-numeric"
            >
              Loading {demoLabels[mode]}...
            </div>
          )}
        </div>
      </nav>

      <div className="pt-36 sm:pt-28">
        <Suspense fallback={<DemoLoadingFallback mode={mode} />}>
          {mode === 'face-comparison' && <FaceComparisonDemo />}
          {mode === 'photo-clustering' && <FaceClusteringDemo />}
        </Suspense>
      </div>
    </div>
  );
};
