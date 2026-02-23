import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import axios from 'axios';
import { Copy, Lock, Unlock, Sparkles, MessageSquare, Users, Home, Settings, Bot, Mic, Check, Loader2, Trash2, RefreshCw } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Utility functions
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// Spinner component
const Spinner = ({ size = 20 }) => (
  <Loader2 className="animate-spin" style={{ width: size, height: size }} />
);

// ==================== TeamGate Component ====================
const TeamGate = ({ onJoin }) => {
  const [mode, setMode] = useState('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState('s1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roles = [
    { id: 's1', label: 'Speaker 1', icon: '🎤' },
    { id: 's2', label: 'Speaker 2', icon: '🎯' },
    { id: 's3', label: 'Speaker 3', icon: '⚡' },
    { id: 'observer', label: 'Observer', icon: '👁' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (mode === 'create') {
        const res = await axios.post(`${API}/teams`, { createdBy: name });
        onJoin({ teamCode: res.data.code, userName: name, role });
      } else {
        if (!code.trim() || code.length < 6) {
          setError('Please enter a valid team code');
          setLoading(false);
          return;
        }
        await axios.get(`${API}/teams/${code.toUpperCase()}`);
        onJoin({ teamCode: code.toUpperCase(), userName: name, role });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="team-gate" data-testid="team-gate">
      <div className="card team-gate-card">
        <div className="team-gate-header">
          <div className="team-gate-logo">⚖️</div>
          <h1 className="team-gate-title">DebateForge</h1>
          <p className="team-gate-subtitle">Collaborative AI-Powered Debate Prep</p>
        </div>

        <div className="team-gate-tabs">
          <button
            className={`team-gate-tab ${mode === 'create' ? 'active' : ''}`}
            onClick={() => setMode('create')}
            data-testid="create-team-tab"
          >
            Create Team
          </button>
          <button
            className={`team-gate-tab ${mode === 'join' ? 'active' : ''}`}
            onClick={() => setMode('join')}
            data-testid="join-team-tab"
          >
            Join Team
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input
              type="text"
              className="input"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="name-input"
            />
          </div>

          {mode === 'join' && (
            <div className="form-group">
              <label className="form-label">Team Code</label>
              <input
                type="text"
                className="input font-mono"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                data-testid="team-code-input"
              />
            </div>
          )}

          <label className="form-label">Your Role</label>
          <div className="role-select">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`role-option ${role === r.id ? 'selected' : ''}`}
                onClick={() => setRole(r.id)}
                data-testid={`role-${r.id}`}
              >
                <span>{r.icon}</span> {r.label}
              </button>
            ))}
          </div>

          {error && <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading} data-testid="submit-btn">
            {loading ? <Spinner size={18} /> : mode === 'create' ? 'Create Team' : 'Join Team'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ==================== HomePreview Component ====================
const HomePreview = ({ teamCode, team, speakersStatus, onNavigate }) => {
  const speakers = [
    { id: 's1', name: 'Speaker 1', role: 'Opening', icon: '🎤' },
    { id: 's2', name: 'Speaker 2', role: 'Extension', icon: '🎯' },
    { id: 's3', name: 'Speaker 3', role: 'Whip', icon: '⚡' },
  ];

  return (
    <div className="animate-fadeIn" data-testid="home-preview">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          {team?.topic || 'No motion set'}
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Team Side: <span style={{ color: 'var(--accent)', fontWeight: '500' }}>
            {team?.side === 'prop' ? 'Proposition' : 'Opposition'}
          </span>
        </p>
      </div>

      <div className="home-grid">
        {speakers.map((speaker) => {
          const status = speakersStatus[speaker.id] || {};
          return (
            <div
              key={speaker.id}
              className="card card-hover speaker-preview-card"
              onClick={() => onNavigate(speaker.id)}
              style={{ cursor: 'pointer' }}
              data-testid={`speaker-card-${speaker.id}`}
            >
              <div className="speaker-header">
                <div className="speaker-title">
                  <span className="speaker-icon">{speaker.icon}</span>
                  <span>{speaker.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {status.isLocked && <Lock size={16} style={{ color: 'var(--warning)' }} />}
                  {status.hasContent && <Check size={16} style={{ color: 'var(--success)' }} />}
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{speaker.role}</p>
              <div className="speech-preview">
                {status.hasContent ? (
                  <p className="speech-preview-text">{status.wordCount} words drafted</p>
                ) : (
                  <p className="speech-preview-empty">No content yet</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="badge badge-accent">
                  <MessageSquare size={12} /> {status.commentCount || 0} comments
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==================== TeamZone Component ====================
const TeamZone = ({ teamCode, team, userName, onConfigUpdate, speakersStatus }) => {
  const [topic, setTopic] = useState(team?.topic || '');
  const [side, setSide] = useState(team?.side || 'prop');
  const [saving, setSaving] = useState(false);
  const [brainstormResult, setBrainstormResult] = useState('');
  const [brainstorming, setBrainstorming] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentColor, setCommentColor] = useState('#a78bfa');
  const [selectedSpeaker, setSelectedSpeaker] = useState('s1');
  const [sendingComment, setSendingComment] = useState(false);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/teams/${teamCode}/config`, { topic, side });
      onConfigUpdate({ topic, side });
    } catch (err) {
      console.error('Failed to save config', err);
    } finally {
      setSaving(false);
    }
  };

  const handleBrainstorm = async () => {
    if (!topic.trim()) return;
    setBrainstorming(true);
    try {
      const res = await axios.post(`${API}/ai/brainstorm`, { topic, side });
      setBrainstormResult(res.data.ideas);
    } catch (err) {
      setBrainstormResult('Failed to generate ideas. Please try again.');
    } finally {
      setBrainstorming(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSendingComment(true);
    try {
      await axios.post(`${API}/comments/${teamCode}/${selectedSpeaker}`, {
        author: userName,
        color: commentColor,
        text: commentText,
      });
      setCommentText('');
    } catch (err) {
      console.error('Failed to send comment', err);
    } finally {
      setSendingComment(false);
    }
  };

  const handleClearComments = async (speakerId) => {
    try {
      await axios.delete(`${API}/comments/${teamCode}/${speakerId}`);
    } catch (err) {
      console.error('Failed to clear comments', err);
    }
  };

  return (
    <div className="animate-fadeIn" data-testid="team-zone">
      <div className="team-zone-grid">
        <div className="card config-section">
          <h3><Settings size={18} /> Debate Configuration</h3>
          
          <div className="form-group">
            <label className="form-label">Motion / Topic</label>
            <textarea
              className="textarea"
              style={{ minHeight: '100px' }}
              placeholder="Enter the debate motion..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              data-testid="topic-input"
            />
          </div>

          <label className="form-label">Team Side</label>
          <div className="side-toggle">
            <button
              className={`side-btn ${side === 'prop' ? 'active' : ''}`}
              onClick={() => setSide('prop')}
              data-testid="side-prop"
            >
              Proposition
            </button>
            <button
              className={`side-btn ${side === 'opp' ? 'active' : ''}`}
              onClick={() => setSide('opp')}
              data-testid="side-opp"
            >
              Opposition
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handleSaveConfig} disabled={saving} data-testid="save-config-btn">
              {saving ? <Spinner size={16} /> : <Check size={16} />} Save Config
            </button>
            <button className="btn btn-secondary" onClick={handleBrainstorm} disabled={brainstorming || !topic.trim()} data-testid="brainstorm-btn">
              {brainstorming ? <Spinner size={16} /> : <Sparkles size={16} />} AI Brainstorm
            </button>
          </div>

          {brainstormResult && (
            <div className="brainstorm-output" data-testid="brainstorm-output">
              {brainstormResult}
            </div>
          )}
        </div>

        <div className="card">
          <h3><Users size={18} /> Team Status</h3>
          
          <div className="status-grid">
            {['s1', 's2', 's3'].map((id, idx) => {
              const status = speakersStatus[id] || {};
              return (
                <div key={id} className="status-item">
                  <div className="status-icon">{['🎤', '🎯', '⚡'][idx]}</div>
                  <div className="status-label">Speaker {idx + 1}</div>
                  <div className="status-value">
                    {status.hasContent ? `${status.wordCount} words` : 'Empty'}
                  </div>
                  {status.isLocked && <Lock size={14} style={{ color: 'var(--warning)', marginTop: '0.25rem' }} />}
                </div>
              );
            })}
          </div>

          <div className="comments-section">
            <div className="comments-header">
              <h4 style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                <MessageSquare size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Team Comments
              </h4>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Send to:</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['s1', 's2', 's3'].map((id, idx) => (
                  <button
                    key={id}
                    className={`btn ${selectedSpeaker === id ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                    onClick={() => setSelectedSpeaker(id)}
                  >
                    S{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="comment-input-row">
              <input
                type="color"
                className="color-picker"
                value={commentColor}
                onChange={(e) => setCommentColor(e.target.value)}
                title="Pick comment color"
              />
              <input
                type="text"
                className="input"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                data-testid="comment-input"
              />
              <button className="btn btn-primary" onClick={handleSendComment} disabled={sendingComment} data-testid="send-comment-btn">
                {sendingComment ? <Spinner size={16} /> : 'Send'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              {['s1', 's2', 's3'].map((id, idx) => (
                <button
                  key={id}
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                  onClick={() => handleClearComments(id)}
                  title={`Clear Speaker ${idx + 1} comments`}
                >
                  <Trash2 size={12} /> S{idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== PasswordModal Component ====================
const PasswordModal = ({ mode, onSubmit, onCancel, loading }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (mode === 'set' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    onSubmit(password);
  };

  const titles = {
    gate: 'Enter Password',
    set: 'Set Password',
    remove: 'Remove Password',
  };

  return (
    <div className="modal-overlay" data-testid="password-modal">
      <div className="modal-content">
        <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>{titles[mode]}</h3>
        
        <div className="form-group">
          <input
            type="password"
            className="input"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            data-testid="password-input"
          />
        </div>

        {mode === 'set' && (
          <div className="form-group">
            <input
              type="password"
              className="input"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="confirm-password-input"
            />
          </div>
        )}

        {error && <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ flex: 1 }} data-testid="password-submit-btn">
            {loading ? <Spinner size={16} /> : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== SpeakerTab Component ====================
const SpeakerTab = ({ teamCode, speakerId, team, userName }) => {
  const [speech, setSpeech] = useState('');
  const [comments, setComments] = useState([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [passwordModal, setPasswordModal] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [rebuttalArg, setRebuttalArg] = useState('');
  const [rebuttalResult, setRebuttalResult] = useState('');
  const [generatingRebuttal, setGeneratingRebuttal] = useState(false);
  const saveTimerRef = useRef(null);

  const speakerNames = {
    s1: { name: 'Speaker 1', role: 'Opening', icon: '🎤' },
    s2: { name: 'Speaker 2', role: 'Extension', icon: '🎯' },
    s3: { name: 'Speaker 3', role: 'Whip', icon: '⚡' },
  };

  const speakerInfo = speakerNames[speakerId] || speakerNames.s1;

  const fetchSpeaker = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/speakers/${teamCode}/${speakerId}`);
      setSpeech(res.data.speech || '');
      setComments(res.data.comments || []);
      setHasPassword(res.data.hasPassword);
      if (!res.data.hasPassword) {
        setIsUnlocked(true);
      }
    } catch (err) {
      console.error('Failed to fetch speaker', err);
    } finally {
      setLoading(false);
    }
  }, [teamCode, speakerId]);

  useEffect(() => {
    fetchSpeaker();
    const interval = setInterval(fetchSpeaker, 5000);
    return () => clearInterval(interval);
  }, [fetchSpeaker]);

  const saveSpeech = useCallback(async (content) => {
    setSaving(true);
    try {
      await axios.put(`${API}/speakers/${teamCode}/${speakerId}`, { speech: content });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to save speech', err);
    } finally {
      setSaving(false);
    }
  }, [teamCode, speakerId]);

  const handleSpeechChange = (e) => {
    const newSpeech = e.target.value;
    setSpeech(newSpeech);
    
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveSpeech(newSpeech);
    }, 1500);
  };

  const handleGenerateSpeech = async () => {
    if (!team?.topic) return;
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/ai/generate-speech`, {
        topic: team.topic,
        side: team.side,
        speakerRole: speakerId,
        existingContent: speech,
      });
      setSpeech(res.data.speech);
      await saveSpeech(res.data.speech);
    } catch (err) {
      console.error('Failed to generate speech', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateRebuttal = async () => {
    if (!rebuttalArg.trim() || !team?.topic) return;
    setGeneratingRebuttal(true);
    try {
      const res = await axios.post(`${API}/ai/generate-rebuttal`, {
        topic: team.topic,
        side: team.side,
        opposingArgument: rebuttalArg,
      });
      setRebuttalResult(res.data.rebuttal);
    } catch (err) {
      setRebuttalResult('Failed to generate rebuttal. Please try again.');
    } finally {
      setGeneratingRebuttal(false);
    }
  };

  const handlePasswordSubmit = async (password) => {
    setPasswordLoading(true);
    try {
      if (passwordModal === 'gate') {
        const res = await axios.post(`${API}/speakers/${teamCode}/${speakerId}/password/verify`, { password });
        if (res.data.valid) {
          setIsUnlocked(true);
          setPasswordModal(null);
        } else {
          alert('Incorrect password');
        }
      } else if (passwordModal === 'set') {
        await axios.post(`${API}/speakers/${teamCode}/${speakerId}/password/set`, { password });
        setHasPassword(true);
        setPasswordModal(null);
      } else if (passwordModal === 'remove') {
        await axios.delete(`${API}/speakers/${teamCode}/${speakerId}/password`);
        setHasPassword(false);
        setPasswordModal(null);
      }
    } catch (err) {
      console.error('Password operation failed', err);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (hasPassword && !isUnlocked) {
    return (
      <div className="card locked-view" data-testid="locked-view">
        <div className="locked-icon">🔐</div>
        <h3 className="locked-title">Document Protected</h3>
        <p className="locked-subtitle">This speaker's document is password protected</p>
        <button className="btn btn-primary" onClick={() => setPasswordModal('gate')} data-testid="unlock-btn">
          <Unlock size={16} /> Unlock Document
        </button>
        {passwordModal && (
          <PasswordModal
            mode={passwordModal}
            onSubmit={handlePasswordSubmit}
            onCancel={() => setPasswordModal(null)}
            loading={passwordLoading}
          />
        )}
      </div>
    );
  }

  const wordCount = speech.trim() ? speech.trim().split(/\s+/).length : 0;

  return (
    <div className="animate-fadeIn" data-testid="speaker-tab">
      <div className="speaker-tab-layout">
        <div className="editor-section">
          <div className="card">
            <div className="editor-header">
              <div className="editor-title">
                <span>{speakerInfo.icon}</span>
                <span>{speakerInfo.name}</span>
                <span className="badge badge-accent">{speakerInfo.role}</span>
              </div>
              <div className="editor-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleGenerateSpeech}
                  disabled={generating || !team?.topic}
                  data-testid="generate-speech-btn"
                >
                  {generating ? <Spinner size={16} /> : <Sparkles size={16} />}
                  {generating ? 'Generating...' : 'AI Generate'}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setPasswordModal(hasPassword ? 'remove' : 'set')}
                  data-testid="password-toggle-btn"
                >
                  {hasPassword ? <Unlock size={16} /> : <Lock size={16} />}
                  {hasPassword ? 'Remove Lock' : 'Add Lock'}
                </button>
              </div>
            </div>

            <textarea
              className="textarea"
              style={{ minHeight: '400px', marginTop: '1rem' }}
              placeholder="Start drafting your speech..."
              value={speech}
              onChange={handleSpeechChange}
              data-testid="speech-textarea"
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <div className="word-count">{wordCount} words</div>
              <div className={`save-indicator ${lastSaved ? 'saved' : ''}`}>
                {saving ? (
                  <><Spinner size={12} /> Saving...</>
                ) : lastSaved ? (
                  <><Check size={12} /> Saved</>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-tools">
          <div className="card tool-card">
            <h4><Sparkles size={16} /> Rebuttal Generator</h4>
            <textarea
              className="textarea rebuttal-input"
              style={{ minHeight: '80px' }}
              placeholder="Enter opposing argument to rebut..."
              value={rebuttalArg}
              onChange={(e) => setRebuttalArg(e.target.value)}
              data-testid="rebuttal-input"
            />
            <button
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={handleGenerateRebuttal}
              disabled={generatingRebuttal || !rebuttalArg.trim()}
              data-testid="generate-rebuttal-btn"
            >
              {generatingRebuttal ? <Spinner size={16} /> : <RefreshCw size={16} />}
              Generate Rebuttal
            </button>
            {rebuttalResult && (
              <div className="rebuttal-output" data-testid="rebuttal-output">
                {rebuttalResult}
              </div>
            )}
          </div>

          <div className="card tool-card">
            <h4><MessageSquare size={16} /> Team Feedback ({comments.length})</h4>
            <div className="comment-list">
              {comments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No comments yet</p>
              ) : (
                comments.map((c, i) => (
                  <div key={i} className="comment-item" style={{ borderLeftColor: c.color }}>
                    <div className="comment-author" style={{ color: c.color }}>{c.author}</div>
                    <div className="comment-text">{c.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {passwordModal && (
        <PasswordModal
          mode={passwordModal}
          onSubmit={handlePasswordSubmit}
          onCancel={() => setPasswordModal(null)}
          loading={passwordLoading}
        />
      )}
    </div>
  );
};

// ==================== AICoach Component ====================
const AICoach = ({ teamCode, team, userName }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const sessionId = useRef(`coach-${teamCode}-${Date.now()}`);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${API}/ai/coach`, {
        sessionId: sessionId.current,
        message: input,
        topic: team?.topic || '',
        side: team?.side || 'prop',
      });
      setMessages((prev) => [...prev, { role: 'ai', content: res.data.response }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'ai', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-coach-container animate-fadeIn" data-testid="ai-coach">
      <div className="card">
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bot size={20} /> AI Debate Coach
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Ask me about strategies, arguments, rebuttals, or anything debate-related!
        </p>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              <Bot size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>Start a conversation with your AI coach</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role}`}>
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="chat-message ai">
              <Spinner size={16} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-row">
          <input
            type="text"
            className="input chat-input"
            placeholder="Ask your coach..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
            disabled={loading}
            data-testid="coach-input"
          />
          <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !input.trim()} data-testid="coach-send-btn">
            {loading ? <Spinner size={16} /> : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== Main App Component ====================
function App() {
  const [session, setSession] = useState(null);
  const [team, setTeam] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [speakersStatus, setSpeakersStatus] = useState({});
  const [copied, setCopied] = useState(false);

  const fetchTeam = useCallback(async () => {
    if (!session?.teamCode) return;
    try {
      const res = await axios.get(`${API}/teams/${session.teamCode}`);
      setTeam(res.data);
    } catch (err) {
      console.error('Failed to fetch team', err);
    }
  }, [session?.teamCode]);

  const fetchSpeakersStatus = useCallback(async () => {
    if (!session?.teamCode) return;
    try {
      const res = await axios.get(`${API}/speakers/${session.teamCode}/all/status`);
      setSpeakersStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch speakers status', err);
    }
  }, [session?.teamCode]);

  useEffect(() => {
    if (session?.teamCode) {
      fetchTeam();
      fetchSpeakersStatus();
      const interval = setInterval(() => {
        fetchTeam();
        fetchSpeakersStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [session?.teamCode, fetchTeam, fetchSpeakersStatus]);

  const handleJoin = ({ teamCode, userName, role }) => {
    setSession({ teamCode, userName, role });
    setActiveTab('home');
  };

  const handleCopyCode = async () => {
    if (session?.teamCode) {
      const success = await copyToClipboard(session.teamCode);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleConfigUpdate = (config) => {
    setTeam((prev) => ({ ...prev, ...config }));
  };

  if (!session) {
    return <TeamGate onJoin={handleJoin} />;
  }

  const tabs = [
    { id: 'home', label: 'Home', icon: <Home size={16} /> },
    { id: 'team', label: 'Team Zone', icon: <Users size={16} /> },
    { id: 's1', label: 'Speaker 1', icon: <Mic size={16} /> },
    { id: 's2', label: 'Speaker 2', icon: <Mic size={16} /> },
    { id: 's3', label: 'Speaker 3', icon: <Mic size={16} /> },
    { id: 'coach', label: 'AI Coach', icon: <Bot size={16} /> },
  ];

  return (
    <div className="app" data-testid="main-app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">⚖️</span>
            <span className="logo-text">DebateForge</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="team-code-badge" onClick={handleCopyCode} data-testid="copy-code-btn">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Team:</span>
              <code>{session.teamCode}</code>
              {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {session.userName}
            </span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <nav className="tabs-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              {tab.icon}
              <span style={{ marginLeft: '0.5rem' }}>{tab.label}</span>
            </button>
          ))}
        </nav>

        {activeTab === 'home' && (
          <HomePreview
            teamCode={session.teamCode}
            team={team}
            speakersStatus={speakersStatus}
            onNavigate={(id) => setActiveTab(id)}
          />
        )}
        {activeTab === 'team' && (
          <TeamZone
            teamCode={session.teamCode}
            team={team}
            userName={session.userName}
            onConfigUpdate={handleConfigUpdate}
            speakersStatus={speakersStatus}
          />
        )}
        {['s1', 's2', 's3'].includes(activeTab) && (
          <SpeakerTab
            key={activeTab}
            teamCode={session.teamCode}
            speakerId={activeTab}
            team={team}
            userName={session.userName}
          />
        )}
        {activeTab === 'coach' && (
          <AICoach
            teamCode={session.teamCode}
            team={team}
            userName={session.userName}
          />
        )}
      </main>
    </div>
  );
}

export default App;
