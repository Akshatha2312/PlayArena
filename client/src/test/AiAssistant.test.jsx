import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiAssistantWidget from '../components/AiAssistantWidget';
import * as AuthContext from '../context/AuthContext';
import * as aiService from '../services/aiService';

vi.mock('../services/aiService', () => ({
  sendChatMessage: vi.fn(),
  default: {
    sendChatMessage: vi.fn()
  }
}));

describe('Phase 19 — Client AI Assistant Widget Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem('token', 'mock_customer_jwt_token');
  });

  const mockCustomerUser = {
    _id: '6aaa9d74c64f9e629c80e101',
    name: 'Customer John',
    email: 'customer@test.com',
    role: 'customer'
  };

  const mockStaffUser = {
    _id: '6aaa9d74c64f9e629c80e201',
    name: 'Staff Mary',
    email: 'staff@test.com',
    role: 'staff'
  };

  it('renders floating assistant toggle button for authenticated customer', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: mockCustomerUser });

    render(
      <MemoryRouter>
        <AiAssistantWidget />
      </MemoryRouter>
    );

    const toggleBtn = document.getElementById('ai-assistant-toggle-btn');
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn.textContent).toContain('Play Arena Assistant');
  });

  it('does NOT render assistant widget for staff user', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: mockStaffUser });

    render(
      <MemoryRouter>
        <AiAssistantWidget />
      </MemoryRouter>
    );

    expect(document.getElementById('ai-assistant-toggle-btn')).toBeNull();
  });

  it('opens chat drawer when toggle button is clicked', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: mockCustomerUser });

    render(
      <MemoryRouter>
        <AiAssistantWidget />
      </MemoryRouter>
    );

    const toggleBtn = document.getElementById('ai-assistant-toggle-btn');
    fireEvent.click(toggleBtn);

    const drawer = document.getElementById('ai-assistant-drawer');
    expect(drawer).toBeInTheDocument();
    expect(screen.getByText(/Customer Support & Guidance/i)).toBeInTheDocument();
  });

  it('handles sending user message and displaying AI response', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: mockCustomerUser });
    vi.mocked(aiService.sendChatMessage).mockResolvedValue({
      role: 'assistant',
      content: 'Play Arena offers 5 exciting indoor games including Badminton, Bowling, and Laser Tag!',
      actionLink: { label: 'Explore Games', path: '/games' }
    });

    render(
      <MemoryRouter>
        <AiAssistantWidget />
      </MemoryRouter>
    );

    // Open chat
    fireEvent.click(document.getElementById('ai-assistant-toggle-btn'));

    const input = document.getElementById('ai-input-field');
    const sendBtn = document.getElementById('ai-send-btn');

    fireEvent.change(input, { target: { value: 'What games do you have?' } });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(aiService.sendChatMessage).toHaveBeenCalled();
    });

    expect(screen.getByText(/Play Arena offers 5 exciting indoor games/i)).toBeInTheDocument();
  });

  it('displays offline notice in chat drawer when offline', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: mockCustomerUser });

    render(
      <MemoryRouter>
        <AiAssistantWidget />
      </MemoryRouter>
    );

    // Open chat
    fireEvent.click(document.getElementById('ai-assistant-toggle-btn'));

    // Trigger offline event
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByText(/Offline mode: Connection required for AI Assistant/i)).toBeInTheDocument();

    // Trigger online event
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.queryByText(/Offline mode: Connection required for AI Assistant/i)).toBeNull();
  });
});
