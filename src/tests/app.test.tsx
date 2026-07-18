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
    await waitFor(
      () => {
        expect(screen.getByText(/Retirement readiness/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
