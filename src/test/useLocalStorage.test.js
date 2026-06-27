import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../hooks/useLocalStorage';

// ─── Basic read/write ─────────────────────────────────────────────────────────

describe('useLocalStorage — initial value', () => {
  beforeEach(() => localStorage.clear());

  it('returns the initialValue when localStorage has no entry for the key', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 42));
    expect(result.current[0]).toBe(42);
  });

  it('returns the stored value when localStorage already has an entry', () => {
    localStorage.setItem('test-key', JSON.stringify('hello'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('hello');
  });

  it('works with object initial values', () => {
    const { result } = renderHook(() => useLocalStorage('obj-key', { a: 1 }));
    expect(result.current[0]).toEqual({ a: 1 });
  });

  it('works with array initial values', () => {
    const { result } = renderHook(() => useLocalStorage('arr-key', [1, 2, 3]));
    expect(result.current[0]).toEqual([1, 2, 3]);
  });
});

// ─── setValue ─────────────────────────────────────────────────────────────────

describe('useLocalStorage — setValue', () => {
  beforeEach(() => localStorage.clear());

  it('updates the returned state value', () => {
    const { result } = renderHook(() => useLocalStorage('key', 0));
    act(() => result.current[1](99));
    expect(result.current[0]).toBe(99);
  });

  it('persists the new value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'old'));
    act(() => result.current[1]('new'));
    expect(JSON.parse(localStorage.getItem('key'))).toBe('new');
  });

  it('accepts a functional updater', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 5));
    act(() => result.current[1](prev => prev + 1));
    expect(result.current[0]).toBe(6);
    expect(JSON.parse(localStorage.getItem('counter'))).toBe(6);
  });

  it('works with object values', () => {
    const { result } = renderHook(() => useLocalStorage('obj', { x: 1 }));
    act(() => result.current[1]({ x: 2, y: 3 }));
    expect(result.current[0]).toEqual({ x: 2, y: 3 });
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('useLocalStorage — error handling', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('falls back to initialValue when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage error');
    });
    const { result } = renderHook(() => useLocalStorage('key', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('still updates state even when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const { result } = renderHook(() => useLocalStorage('key', 'old'));
    act(() => result.current[1]('new'));
    // state should still update even though persist failed
    expect(result.current[0]).toBe('new');
  });

  it('falls back to initialValue when stored JSON is malformed', () => {
    localStorage.setItem('key', 'not-valid-json{{{');
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    expect(result.current[0]).toBe('default');
  });
});

// ─── Stability ────────────────────────────────────────────────────────────────

describe('useLocalStorage — setValue stability', () => {
  beforeEach(() => localStorage.clear());

  it('setValue reference is stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useLocalStorage('key', 0));
    const firstSetter = result.current[1];
    rerender();
    expect(result.current[1]).toBe(firstSetter);
  });
});
