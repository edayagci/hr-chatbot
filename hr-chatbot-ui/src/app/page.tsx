// ==========================
// page.tsx  — PART 1/2 (TOP)
// ==========================
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  Sparkles,
  Moon,
  Sun,
  Search,
  Trash2,
  User,
  ArrowLeft,
} from 'lucide-react';

interface ChatEntry {
  question: string;
  answer: string;
  rating: number;
  timestamp: string;
  links?: Array<{
    file_title: string;
    attachment_url: string;
  }>;
}

export default function Home() {
  // ===== Auth state =====
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');

  // ===== Chat state =====
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatEntry[][]>([]);
  const [activeChatIndex, setActiveChatIndex] = useState<number>(-1);
  const [collapsed, setCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasMounted, setHasMounted] = useState(false);

  // ===== On mount: load user + settings + per-user chats =====
  useEffect(() => {
    setHasMounted(true);
    const savedUser = localStorage.getItem('hr_user');
    if (savedUser) {
      setCurrentUser(savedUser);
      const perUser = localStorage.getItem(`chatHistory_${savedUser}`);
      if (perUser) setChatHistory(JSON.parse(perUser));
    }
    const savedDark = localStorage.getItem('hr_dark');
    if (savedDark === 'true') setDarkMode(true);
  }, []);

  // Persist user
  useEffect(() => {
    if (!hasMounted) return;
    if (currentUser) localStorage.setItem('hr_user', currentUser);
    else localStorage.removeItem('hr_user');
  }, [currentUser, hasMounted]);

  // Persist dark mode
  useEffect(() => {
    if (!hasMounted) return;
    localStorage.setItem('hr_dark', darkMode.toString());
  }, [darkMode, hasMounted]);

  // Apply dark class to <html>
  useEffect(() => {
    if (!hasMounted) return;
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode, hasMounted]);

  // Persist chats per user
  useEffect(() => {
    if (!hasMounted || !currentUser) return;
    localStorage.setItem(`chatHistory_${currentUser}`, JSON.stringify(chatHistory));
  }, [chatHistory, currentUser, hasMounted]);

  // ===== Auth handlers (expects API routes to hit filesystem) =====
  const handleLogin = async () => {
    setAuthError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (!data.success) {
        setAuthError(data.error || 'Login failed');
        return;
      }
      setCurrentUser(loginUsername);
      // Load user chats after login
      const stored = localStorage.getItem(`chatHistory_${loginUsername}`);
      setChatHistory(stored ? JSON.parse(stored) : []);
      setActiveChatIndex(-1);
      setShowAuthModal(false);
      setLoginPassword('');
    } catch {
      setAuthError('Server error');
    }
  };

  const handleSignup = async () => {
    setAuthError('');
    if (signupPassword !== signupConfirm) {
      setAuthError('Passwords do not match');
      return;
    }
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: signupUsername, password: signupPassword }),
      });
      const data = await res.json();
      if (!data.success) {
        setAuthError(data.error || 'Signup failed');
        return;
      }
      // After signup, go back to login tab
      setAuthMode('login');
      setLoginUsername(signupUsername);
      setLoginPassword('');
      setSignupPassword('');
      setSignupConfirm('');
    } catch {
      setAuthError('Server error');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setChatHistory([]);
    setActiveChatIndex(-1);
  };

  // ===== Chat handlers =====
  const handleSubmit = async () => {
    if (!currentUser || !question.trim() || isLoading) return;
    const timestamp = new Date().toISOString();
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error('Bad response');
      const data = await res.json();
      const entry: ChatEntry = {
        question,
        answer: data.answer,
        rating: 0,
        timestamp,
        links: data.links || [],
      };
      setChatHistory(prev => {
        const u = [...prev];
        if (activeChatIndex >= 0) u[activeChatIndex] = [...u[activeChatIndex], entry];
        else {
          u.unshift([entry]);
          setActiveChatIndex(0);
        }
        return u;
      });
    } catch {
      const entry: ChatEntry = {
        question,
        answer: 'Error connecting to server.',
        rating: 0,
        timestamp,
      };
      setChatHistory(prev => {
        const u = [...prev];
        if (activeChatIndex >= 0) u[activeChatIndex] = [...u[activeChatIndex], entry];
        else {
          u.unshift([entry]);
          setActiveChatIndex(0);
        }
        return u;
      });
    } finally {
      setIsLoading(false);
      setQuestion('');
    }
  };

  const handleRating = (rating: number, idx: number) => {
    setChatHistory(prev => {
      const u = [...prev];
      const chat = [...u[activeChatIndex]];
      chat[idx].rating = rating;
      u[activeChatIndex] = chat;
      return u;
    });
  };

  const handleNewChat = () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    setChatHistory(prev => [[...[]], ...prev]);
    setActiveChatIndex(0);
    setQuestion('');
  };

  const deleteChat = (index: number) => {
    setChatHistory(prev => {
      const u = prev.filter((_, i) => i !== index);
      if (activeChatIndex === index) setActiveChatIndex(-1);
      else if (activeChatIndex > index) setActiveChatIndex(activeChatIndex - 1);
      return u;
    });
  };

  // Focus and autoscroll
  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeChatIndex]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, activeChatIndex]);

  // Search filter
  const filteredChats = chatHistory.filter(chat =>
    chat.some(
      e =>
        e.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  if (!hasMounted) return null;

  return (
    <div
      className={`flex min-h-screen ${
        darkMode ? 'dark bg-gray-900 text-white' : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900'
      }`}
    >
      {/* ======================= AUTH MODAL ======================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl p-6 shadow-lg dark:bg-gray-800 bg-white">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {authMode === 'login' ? 'Login' : 'Create Account'}
              </h2>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthError('');
                }}
                className="rounded p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {authError && <p className="mb-2 text-sm text-red-500">{authError}</p>}

            {authMode === 'login' ? (
              <>
                <div className="mb-2">
                  <label className="mb-1 block text-sm font-medium">Username</label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    className="w-full rounded border p-2 dark:border-gray-700 dark:bg-gray-700"
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium">Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full rounded border p-2 dark:border-gray-700 dark:bg-gray-700"
                  />
                </div>
                <Button onClick={handleLogin} className="mb-2 w-full">
                  Login
                </Button>
                <p className="text-center text-sm">
                  Don’t have an account?{' '}
                  <button
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthError('');
                      setSignupUsername(loginUsername);
                    }}
                    className="text-blue-500"
                  >
                    Sign Up
                  </button>
                </p>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center">
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                    }}
                    className="mr-2 rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                    aria-label="Back to login"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <h3 className="text-lg font-semibold">Create Account</h3>
                </div>
                <div className="mb-2">
                  <label className="mb-1 block text-sm font-medium">Username</label>
                  <input
                    type="text"
                    value={signupUsername}
                    onChange={e => setSignupUsername(e.target.value)}
                    className="w-full rounded border p-2 dark:border-gray-700 dark:bg-gray-700"
                  />
                </div>
                <div className="mb-2">
                  <label className="mb-1 block text-sm font-medium">Password</label>
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    className="w-full rounded border p-2 dark:border-gray-700 dark:bg-gray-700"
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium">Confirm Password</label>
                  <input
                    type="password"
                    value={signupConfirm}
                    onChange={e => setSignupConfirm(e.target.value)}
                    className="w-full rounded border p-2 dark:border-gray-700 dark:bg-gray-700"
                  />
                </div>
                <Button onClick={handleSignup} className="mb-2 w-full">
                  Create Account
                </Button>
                <p className="text-center text-sm">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                      setLoginUsername(signupUsername);
                    }}
                    className="text-blue-500"
                  >
                    Login
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ======================= SIDEBAR ======================= */}
      <aside
        className={`sticky top-0 flex h-screen flex-col border-r shadow-sm transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        } ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}
      >
        <div
          className={`flex items-center justify-between border-b p-4 ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          {!collapsed && (
            <h2 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
              HR Chatbot
            </h2>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            className={`rounded-full p-2 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {!collapsed && (
          <div className="relative p-3">
            <Search className="absolute left-6 top-[22px] h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-6 top-[18px] text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        )}

        <div className="p-3">
          <Button
            onClick={handleNewChat}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md hover:from-blue-600 hover:to-purple-600"
          >
            {collapsed ? <Plus size={20} /> : 'New Chat'}
          </Button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {filteredChats.map((chat, idx) => {
            const isActive = idx === activeChatIndex;
            const base = 'w-full cursor-pointer items-center justify-between rounded-lg p-3 transition-all';
            const variant = isActive
              ? `${darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-blue-100 to-purple-100'} ${
                  darkMode ? 'border-gray-600' : 'border-blue-200'
                } border shadow-sm`
              : `${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} border border-transparent`;
            return (
              <div
                key={idx}
                className={`${base} ${variant} flex`}
                onClick={() => setActiveChatIndex(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setActiveChatIndex(idx)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className={`h-2 w-2 flex-shrink-0 rounded-full ${darkMode ? 'bg-purple-400' : 'bg-blue-500'}`} />
                  <p className="truncate text-sm font-medium">
                    {chat[0]?.question?.slice(0, collapsed ? 0 : 20) || `Chat ${idx + 1}`}
                  </p>
                </div>
                {!collapsed && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deleteChat(idx);
                    }}
                    className={`rounded-full p-1 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                    aria-label="Delete chat"
                  >
                    <Trash2 size={16} className={darkMode ? 'text-gray-300' : 'text-gray-500'} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ======================= MAIN ======================= */}
      <main className="mx-auto flex w-full max-w-4xl flex-grow flex-col">
        {/* Header */}
        <header
          className={`sticky top-0 z-10 flex items-center justify-between border-b px-6 py-4 backdrop-blur-sm ${
            darkMode ? 'border-gray-700 bg-gray-800/80' : 'border-gray-200 bg-white/80'
          }`}
        >
          <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-2xl font-bold text-transparent">
            Telenity HR Assistant
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-yellow-500" size={20} />
              <span className={darkMode ? 'text-gray-300 text-sm' : 'text-gray-500 text-sm'}>AI-powered HR</span>
            </div>

            <button
              onClick={() => setDarkMode(v => !v)}
              className={`rounded-full p-2 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={20} className="text-yellow-300" /> : <Moon size={20} />}
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className={darkMode ? 'text-gray-300 text-sm' : 'text-gray-700 text-sm'}>
                  {currentUser}
                </span>
                <button
                  onClick={handleLogout}
                  className={`rounded-full p-2 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                  aria-label="Logout"
                >
                  <User size={20} />
                </button>
              </div>
            ) : (
              <Button onClick={() => setShowAuthModal(true)} variant="outline">
                <User size={16} className="mr-2" />
                Login / Sign Up
              </Button>
            )}
          </div>
        </header>
                {/* Chat content area */}
        <div
          className={`flex flex-col gap-4 p-6 flex-grow overflow-y-auto ${
            darkMode ? 'bg-gray-900' : ''
          }`}
        >
          {activeChatIndex < 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div
                className={`mb-4 rounded-full p-6 ${
                  darkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-blue-100 to-purple-100'
                }`}
              >
                <Sparkles className="text-blue-500" size={48} />
              </div>
              <h3
                className={`mb-2 text-xl font-semibold ${
                  darkMode ? 'text-gray-100' : 'text-gray-800'
                }`}
              >
                How can I help you today?
              </h3>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                Ask me anything about HR policies, benefits, onboarding, or other workplace
                questions.
              </p>
            </div>
          ) : (
            <>
              {chatHistory[activeChatIndex]?.map((entry, i) => (
                <div key={i} className="space-y-3">
                  {/* User Question */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%]">
                      <Card
                        className={`rounded-2xl shadow-sm ${
                          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100'
                        }`}
                      >
                        <CardContent className="p-4">
                          <p className={darkMode ? 'text-gray-100' : 'text-gray-800'}>
                            {entry.question}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Bot Answer */}
                  <div className="flex justify-start">
                    <div className="max-w-[80%]">
                      <Card
                        className={`rounded-2xl shadow-sm ${
                          darkMode
                            ? 'bg-gray-800 border-gray-700'
                            : 'bg-gradient-to-br from-gray-50 to-white border-gray-100'
                        }`}
                      >
                        <CardContent className="space-y-4 p-4">
                          <div className={darkMode ? 'text-gray-200' : 'text-gray-700'}>
                            {entry.answer}
                          </div>

                          {/* References */}
                          {entry.links && entry.links.length > 0 && (
                            <div className="mt-2">
                              <p
                                className={`mb-2 text-sm font-medium ${
                                  darkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}
                              >
                                References:
                              </p>
                              <ul className="space-y-1">
                                {entry.links.map((link, j) => (
                                  <li key={j}>
                                    <a
                                      href={link.attachment_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                      {link.file_title}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Rating */}
                          <div className="flex items-center gap-1">
                            <span className="mr-2 text-xs text-gray-400">Rate this response:</span>
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                onClick={() => handleRating(star, i)}
                                className={`h-4 w-4 cursor-pointer transition-colors ${
                                  entry.rating >= star
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : darkMode
                                    ? 'text-gray-500 hover:text-yellow-400'
                                    : 'text-gray-300 hover:text-yellow-400'
                                }`}
                              />
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div
          className={`sticky bottom-0 border-t p-4 backdrop-blur-sm ${
            darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-200'
          }`}
        >
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex items-end gap-2"
          >
            <Textarea
              ref={textareaRef}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={
                currentUser ? 'Ask your HR question...' : 'Login or sign up to start chatting...'
              }
              className={`min-h-[60px] max-h-[200px] flex-grow resize-none rounded-xl shadow-sm ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              disabled={isLoading || !currentUser}
            />
            <Button
              type="submit"
              className="h-[60px] w-16 bg-gradient-to-r from-blue-500 to-purple-500 shadow-md hover:from-blue-600 hover:to-purple-600"
              disabled={isLoading || !question.trim() || !currentUser}
              aria-disabled={isLoading || !question.trim() || !currentUser}
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
              ) : (
                <Send className="text-white" />
              )}
            </Button>
          </form>
          <p className={`mt-2 text-center text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Telenity HR Assistant may produce inaccurate information about people, places, or facts.
          </p>
        </div>
      </main>
    </div>
  );
}

        
