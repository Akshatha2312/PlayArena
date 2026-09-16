import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { sendChatMessage } from '../services/aiService';
import { Bot, Send, X, RefreshCw, Sparkles, MessageSquare, ChevronRight, AlertCircle, WifiOff } from 'lucide-react';

export function AiAssistantWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your Play Arena Assistant. I can help you find games, check your bookings, view invoices, track support tickets, and guide you through the app.",
      actionLink: { label: 'Explore Games', path: '/games' }
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen && chatEndRef.current && typeof chatEndRef.current.scrollIntoView === 'function') {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Don't render assistant widget for staff, admin, or unauthenticated guests
  if (!user || user.role !== 'customer') {
    return null;
  }

  const handleSend = async (textToSend) => {
    const query = textToSend || inputMsg;
    if (!query.trim() || isLoading) return;

    if (!isOnline) {
      setErrorMsg("You're offline. The Play Arena Assistant needs an internet connection.");
      return;
    }

    const userMsgObj = {
      id: Date.now().toString(),
      role: 'user',
      content: query.trim()
    };

    const newHistory = [...messages, userMsgObj];
    setMessages(newHistory);
    setInputMsg('');
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const responseData = await sendChatMessage(query.trim(), newHistory);

      const assistantMsgObj = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseData.content,
        actionLink: responseData.actionLink
      };

      setMessages(prev => [...prev, assistantMsgObj]);
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionText) => {
    handleSend(actionText);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Conversation cleared. How else can I help you with Play Arena today?",
        actionLink: { label: 'Browse Games', path: '/games' }
      }
    ]);
    setErrorMsg(null);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          id="ai-assistant-toggle-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Open Play Arena Assistant"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '9999px',
            padding: '0.75rem 1.25rem',
            boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            zIndex: 9990,
            transition: 'transform 0.2s, background-color 0.2s'
          }}
        >
          <Sparkles style={{ width: '1.25rem', height: '1.25rem' }} />
          <span>Play Arena Assistant</span>
        </button>
      )}

      {/* Expandable Chat Drawer */}
      {isOpen && (
        <div
          id="ai-assistant-drawer"
          role="dialog"
          aria-label="Play Arena Customer AI Assistant"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            width: '380px',
            maxWidth: 'calc(100vw - 2rem)',
            height: '560px',
            maxHeight: 'calc(100vh - 3rem)',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            borderRadius: '1rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px #334155',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#1e293b',
              borderBottom: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '2.25rem',
                  height: '2.25rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Bot style={{ width: '1.375rem', height: '1.375rem', color: '#ffffff' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#f8fafc' }}>
                  Play Arena Assistant
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Customer Support & Guidance
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <button
                id="ai-clear-btn"
                onClick={handleClearHistory}
                title="Clear conversation"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.375rem',
                  borderRadius: '0.375rem'
                }}
              >
                <RefreshCw style={{ width: '1rem', height: '1rem' }} />
              </button>
              <button
                id="ai-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close assistant"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.375rem',
                  borderRadius: '0.375rem'
                }}
              >
                <X style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>
          </div>

          {/* Offline Notice inside Chat Drawer */}
          {!isOnline && (
            <div
              style={{
                backgroundColor: '#991b1b',
                color: '#fef2f2',
                padding: '0.5rem 0.75rem',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <WifiOff style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
              <span>Offline mode: Connection required for AI Assistant.</span>
            </div>
          )}

          {/* Message List */}
          <div
            style={{
              flex: 1,
              padding: '1rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.875rem'
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.4',
                    backgroundColor: msg.role === 'user' ? '#0284c7' : '#1e293b',
                    color: '#ffffff',
                    border: msg.role === 'assistant' ? '1px solid #334155' : 'none'
                  }}
                >
                  {msg.content}
                </div>

                {/* Optional Action Link Button */}
                {msg.actionLink && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate(msg.actionLink.path);
                    }}
                    style={{
                      marginTop: '0.5rem',
                      backgroundColor: 'transparent',
                      color: '#38bdf8',
                      border: '1px solid #0284c7',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <span>{msg.actionLink.label}</span>
                    <ChevronRight style={{ width: '0.875rem', height: '0.875rem' }} />
                  </button>
                )}
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
                <Bot style={{ width: '1rem', height: '1rem', animation: 'spin 2s linear infinite' }} />
                <span>Play Arena Assistant is processing...</span>
              </div>
            )}

            {errorMsg && (
              <div
                style={{
                  backgroundColor: '#450a0a',
                  color: '#fca5a5',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid #7f1d1d'
                }}
              >
                <AlertCircle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Action Chips */}
          <div
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: '#0f172a',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              gap: '0.375rem',
              overflowX: 'auto',
              whiteSpace: 'nowrap'
            }}
          >
            {[
              'Find a game',
              'My next booking',
              'My invoices',
              'My support issues',
              'How do I book?'
            ].map((actionText) => (
              <button
                key={actionText}
                onClick={() => handleQuickAction(actionText)}
                disabled={isLoading || !isOnline}
                style={{
                  backgroundColor: '#1e293b',
                  color: '#cbd5e1',
                  border: '1px solid #334155',
                  padding: '0.25rem 0.625rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  cursor: isLoading || !isOnline ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !isOnline ? 0.6 : 1,
                  flexShrink: 0
                }}
              >
                {actionText}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#1e293b',
              borderTop: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <input
              id="ai-input-field"
              type="text"
              placeholder={isOnline ? "Ask Play Arena Assistant..." : "Offline (connection required)"}
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              disabled={isLoading || !isOnline}
              style={{
                flex: 1,
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
            <button
              id="ai-send-btn"
              type="submit"
              disabled={isLoading || !inputMsg.trim() || !isOnline}
              aria-label="Send message"
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                width: '2.25rem',
                height: '2.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isLoading || !inputMsg.trim() || !isOnline ? 'not-allowed' : 'pointer',
                opacity: isLoading || !inputMsg.trim() || !isOnline ? 0.5 : 1
              }}
            >
              <Send style={{ width: '1rem', height: '1rem' }} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default AiAssistantWidget;
