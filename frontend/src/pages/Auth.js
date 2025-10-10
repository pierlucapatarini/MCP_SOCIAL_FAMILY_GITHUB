import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/MainStyle.css';
import '../styles/AuthStyle.css';

function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [familyGroup, setFamilyGroup] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Accesso riuscito!' });
      navigate('/main-menu');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { family_group: familyGroup, username: username },
      },
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Registrazione riuscita! Controlla la tua email per confermare.' });
      setIsRegistering(false);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      {/* Hero Section con immagine di sfondo */}
      <div className="auth-hero">
        <div className="hero-background">
          <img 
            src="/images/1.jpg" 
            alt="Famiglia che cucina insieme" 
            className="hero-image"
          />
          <div className="hero-overlay"></div>
        </div>
        
        <div className="hero-content">
          <div className="brand-section">
            <div className="app-logo">
              <span className="logo-icon">🍽️</span>
              <h1 className="app-title">FamilyFood</h1>
            </div>
            <p className="app-tagline">
              L'app che unisce la tua famiglia attraverso il cibo
            </p>
            <div className="features-preview">
              <div className="feature-item">
                <span className="feature-icon">🛒</span>
                <span>Lista della spesa condivisa</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🍳</span>
                <span>Ricette AI personalizzate</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>Analisi nutrizionale</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="auth-form-section">
        <div className="form-container">
          <div className="form-card modern">
            <div className="form-header">
              <h2 className="form-title">
                {isRegistering ? (
                  <>
                    <span className="title-icon">👨‍👩‍👧‍👦</span>
                    Unisciti alla famiglia
                  </>
                ) : (
                  <>
                    <span className="title-icon">🏠</span>
                    Bentornato a casa
                  </>
                )}
              </h2>
              <p className="form-subtitle">
                {isRegistering 
                  ? 'Crea il tuo account famiglia e inizia a condividere i pasti'
                  : 'Accedi per gestire la tua famiglia e i tuoi pasti'
                }
              </p>
            </div>
            
            {message && (
              <div className={`message-alert ${message.type}`}>
                <span className="alert-icon">
                  {message.type === 'error' ? '⚠️' : '✅'}
                </span>
                <span className="alert-text">{message.text}</span>
              </div>
            )}

            {isRegistering ? (
              <form onSubmit={handleRegister} className="auth-form">
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">📧</span>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="La tua email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input modern"
                    required
                    autoComplete="email"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">🔒</span>
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="Crea una password sicura"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input modern"
                    required
                    autoComplete="new-password"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">👤</span>
                    Nome Utente
                  </label>
                  <input
                    type="text"
                    placeholder="Come ti chiami?"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="form-input modern"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">🏠</span>
                    Gruppo Famiglia
                  </label>
                  <input
                    type="text"
                    placeholder="Es. Famiglia Rossi"
                    value={familyGroup}
                    onChange={(e) => setFamilyGroup(e.target.value)}
                    className="form-input modern"
                    required
                  />
                  <small className="input-help">
                    Questo nome identificherà la tua famiglia nell'app
                  </small>
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="auth-button primary"
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner"></span>
                      Creazione account...
                    </>
                  ) : (
                    <>
                      <span className="button-icon">🚀</span>
                      Crea il mio account famiglia
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="auth-form">
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">📧</span>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="La tua email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input modern"
                    required
                    autoComplete="email"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">🔒</span>
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="La tua password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input modern"
                    required
                    autoComplete="current-password"
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="auth-button primary"
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner"></span>
                      Accesso in corso...
                    </>
                  ) : (
                    <>
                      <span className="button-icon">🏠</span>
                      Accedi alla famiglia
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="form-footer">
              <button
                className="switch-mode-button"
                onClick={() => setIsRegistering(!isRegistering)}
                type="button"
              >
                {isRegistering ? (
                  <>
                    <span className="switch-icon">👋</span>
                    Hai già un account? Accedi
                  </>
                ) : (
                  <>
                    <span className="switch-icon">✨</span>
                    Non hai un account? Registrati
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Testimonial Section */}
          <div className="testimonial-section">
            <div className="testimonial-card">
              <div className="family-illustration">
                <img 
                  src="/images/2.jpg" 
                  alt="Famiglia felice" 
                  className="family-image"
                />
              </div>
              <blockquote className="testimonial-quote">
                "FamilyFood ha trasformato il modo in cui organizziamo i pasti. 
                Ora tutti in famiglia partecipano alla spesa e alla cucina!"
              </blockquote>
              <cite className="testimonial-author">
                <span className="author-name">Famiglia Bianchi</span>
                <span className="author-detail">Utenti da 6 mesi</span>
              </cite>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="floating-elements">
        <div className="floating-icon" style={{top: '20%', left: '10%'}}>🥕</div>
        <div className="floating-icon" style={{top: '60%', right: '15%'}}>🍎</div>
        <div className="floating-icon" style={{bottom: '30%', left: '5%'}}>🥬</div>
        <div className="floating-icon" style={{top: '40%', right: '5%'}}>🍅</div>
      </div>
    </div>
  );
}

export default Auth;

