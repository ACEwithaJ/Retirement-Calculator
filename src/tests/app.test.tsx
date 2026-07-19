import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('App smoke test', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the shell and overview without throwing', () => {
    render(<App />);
    // Page heading (h1), distinct from the nav button of the same name.
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    // The navigation lists all twelve sections.
    expect(screen.getByRole('button', { name: /Methodology/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Withdrawal Strategy/ })).toBeInTheDocument();
  });

  it('shows the not-advice disclaimer prominently', () => {
    render(<App />);
    expect(
      screen.getByText(/not financial, tax, investment, or legal advice/i),
    ).toBeInTheDocument();
  });

  it('computes and displays live results for the default scenario', async () => {
    render(<App />);
    // The live preview runs after a debounce; the readiness banner appears.
    // The readiness banner comes from the live results preview. The Overview
    // page also kicks off an expensive 85%-spending solve on mount; in the
    // browser both run in a Web Worker, but under jsdom they run synchronously,
    // so allow a generous window for the preview to compute and paint.
    await waitFor(
      () => {
        expect(screen.getByText(/Retirement readiness/i)).toBeInTheDocument();
      },
      { timeout: 20000 },
    );
  }, 30000);
});
