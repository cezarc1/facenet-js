import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../examples/src/features/face-detection/FaceComparisonDemo', () => ({
  default: () => <div>Face comparison content</div>,
}));

vi.mock('../../examples/src/features/face-clustering/FaceClusteringDemo', () => ({
  default: () => <div>Face clustering content</div>,
}));

vi.mock('../../examples/src/shared/components/GitHubStats', () => ({
  GitHubStats: () => <a href="https://github.com/cezarc1/facenet-js">GitHub</a>,
}));

describe('example app shell', () => {
  it('keeps the floating tab banner outside lazy-loaded tab content', async () => {
    const { App } = await import('../../examples/src/App');

    render(<App />);

    expect(screen.getByRole('navigation', { name: 'FaceNet demo sections' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Face Comparison' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Face Clustering' })).not.toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Loading Face Comparison');

    expect(await screen.findByText('Face comparison content')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Face Clustering' }));

    expect(await screen.findByText('Face clustering content')).not.toBeNull();
  });
});
