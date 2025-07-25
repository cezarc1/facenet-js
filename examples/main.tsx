import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import FaceNetWeb from "./FaceNetWeb";
import FaceClusteringDemo from "./FaceClusteringDemo";
import "./index.css";

type DemoMode = 'face-comparison' | 'photo-clustering';

const App = () => {
  const [mode, setMode] = useState<DemoMode>('face-comparison');

  return (
    <div>
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-8 py-4">
            <button
              onClick={() => setMode('face-comparison')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${mode === 'face-comparison'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-gray-600 hover:text-teal-600 hover:bg-teal-50'
                }`}
            >
              Face Comparison
            </button>
            <button
              onClick={() => setMode('photo-clustering')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${mode === 'photo-clustering'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                }`}
            >
              Face Clustering
            </button>
          </div>
        </div>
      </div>

      {mode === 'face-comparison' && <FaceNetWeb />}
      {mode === 'photo-clustering' && <FaceClusteringDemo />}
    </div>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode >,
);
