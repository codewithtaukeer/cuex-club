import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Phone, Mail, Lock, User, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const { signInWithEmail, signUpWithEmail, signInWithOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = searchParams.get('redirect') || '/booking';
  const facility = searchParams.get('facility');
  const isAdminLogin = redirectTarget.includes('admin');

  const finalRedirect = facility ? `${redirectTarget}?facility=${facility}` : redirectTarget;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      if (authMode === 'signin') {
        const { error } = await signInWithEmail(email.trim(), password);
        if (error) throw error;
        navigate(finalRedirect);
      } else {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (!phone.trim()) {
          throw new Error('Please enter your mobile phone number.');
        }
        const { error } = await signUpWithEmail(email.trim(), password, fullName.trim(), phone.trim());
        if (error) throw error;
        setInfoMsg('Account created successfully! Signing you in...');
        setTimeout(() => {
          navigate(finalRedirect);
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setErrorMsg('Please enter your 10-digit mobile number.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await signInWithOtp(phone.trim());
      if (error) {
        // If SMS provider not yet configured on Supabase, offer email fallback
        throw new Error(error.message + ' (Tip: You can also switch to Email login below for instant sign-in!)');
      }
      setOtpSent(true);
      setInfoMsg('OTP sent to your phone! Please enter the 6-digit code below.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken.trim()) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await verifyOtp(phone.trim(), otpToken.trim());
      if (error) throw error;
      navigate(finalRedirect);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex flex-col justify-center items-center px-4 py-20 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cuexemerald/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-champagne/10 blur-[150px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Logo & Headline */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-b from-champagne to-transparent mx-auto shadow-gold-glow">
              <img
                src="/assets/cuex-logo.png"
                alt="CueX"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </Link>

          <h1 className="font-display text-3xl sm:text-4xl text-warmivory uppercase tracking-tight mb-2">
            {isAdminLogin ? 'ADMIN PORTAL' : 'YOUR NEXT GAME STARTS HERE.'}
          </h1>
          <p className="text-xs text-mutedgrey max-w-xs mx-auto leading-relaxed">
            {isAdminLogin
              ? 'Sign in with your CueX management credentials to control reservations and tables.'
              : 'Sign in to CueX to manage your bookings and profile.'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl bg-charcoal/90 border border-champagne/30 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Sign In vs Sign Up Tabs (Only show Sign Up for non-admins) */}
          {!isAdminLogin ? (
            <div className="flex rounded-xl bg-obsidian p-1 mb-6 border border-white/5">
              <button
                onClick={() => {
                  setAuthMode('signin');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  authMode === 'signin'
                    ? 'bg-champagne text-obsidian shadow-sm'
                    : 'text-mutedgrey hover:text-warmivory'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthMode('signup');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  authMode === 'signup'
                    ? 'bg-champagne text-obsidian shadow-sm'
                    : 'text-mutedgrey hover:text-warmivory'
                }`}
              >
                Create Account
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne text-xs font-semibold uppercase tracking-wider mb-6 justify-center">
              <ShieldCheck className="w-4 h-4" />
              <span>Owner & Admin Authentication</span>
            </div>
          )}

          {/* Method Selector: Email vs Phone (only for non-admin) */}
          {!isAdminLogin && (
            <div className="flex items-center justify-center gap-4 mb-6 text-xs text-mutedgrey">
              <button
                type="button"
              onClick={() => {
                setAuthMethod('email');
                setErrorMsg(null);
              }}
              className={`flex items-center gap-1.5 pb-1 border-b-2 transition-all ${
                authMethod === 'email'
                  ? 'border-champagne text-champagne font-bold'
                  : 'border-transparent hover:text-warmivory'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Email & Password
            </button>
            <span className="text-white/20">•</span>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('phone');
                setErrorMsg(null);
              }}
              className={`flex items-center gap-1.5 pb-1 border-b-2 transition-all ${
                authMethod === 'phone'
                  ? 'border-champagne text-champagne font-bold'
                  : 'border-transparent hover:text-warmivory'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              Phone OTP
            </button>
          </div>
          )}

          {/* Feedback messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="mb-4 p-3 rounded-xl bg-cuexemerald/10 border border-cuexemerald/30 text-emerald-400 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* FORM: EMAIL */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-mutedgrey uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-mutedgrey" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-obsidian border border-white/10 focus:border-champagne text-warmivory text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-mutedgrey uppercase tracking-wider mb-1">
                      Mobile Number (+91)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 w-4 h-4 text-mutedgrey" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9876543210"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-obsidian border border-white/10 focus:border-champagne text-warmivory text-xs outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-mutedgrey uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-mutedgrey" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-obsidian border border-white/10 focus:border-champagne text-warmivory text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-mutedgrey uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-mutedgrey" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-obsidian border border-white/10 focus:border-champagne text-warmivory text-xs outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-champagne via-warmgold to-champagne text-obsidian font-bold text-xs uppercase tracking-widest shadow-gold-glow hover:shadow-gold-glow-lg transition-transform active:scale-98 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Please wait...</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === 'signin' ? 'Sign In to CueX' : 'Create Customer Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORM: PHONE OTP */}
          {authMethod === 'phone' && (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-mutedgrey uppercase tracking-wider mb-1">
                      Indian Mobile Number
                    </label>
                    <div className="relative flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl bg-obsidian border border-r-0 border-white/10 text-mutedgrey text-xs">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className="w-full px-3.5 py-2.5 rounded-r-xl bg-obsidian border border-white/10 focus:border-champagne text-warmivory text-xs outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-champagne to-warmgold text-obsidian font-bold text-xs uppercase tracking-widest shadow-gold-glow flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send 6-Digit OTP</span>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-mutedgrey uppercase tracking-wider mb-1">
                      Enter 6-Digit OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpToken}
                      onChange={(e) => setOtpToken(e.target.value.trim())}
                      placeholder="123456"
                      className="w-full px-4 py-3 rounded-xl bg-obsidian border border-champagne text-center font-display text-2xl tracking-[0.5em] text-champagne outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-champagne to-warmgold text-obsidian font-bold text-xs uppercase tracking-widest shadow-gold-glow flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify & Sign In</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="w-full text-xs text-mutedgrey hover:text-champagne py-1 text-center"
                  >
                    Change Phone Number
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Guest reminder */}
          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <Link to="/" className="text-xs text-mutedgrey hover:text-champagne transition-colors">
              ← Return to CueX Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
