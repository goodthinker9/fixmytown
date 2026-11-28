import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import AuthShell from '../components/AuthShell.jsx';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function Login() {
  const { login }     = useAuth();
  const navigate      = useNavigate();
  const location      = useLocation();
  const from          = location.state?.from?.pathname || '/dashboard';

  const [form, setForm]             = useState({ email: '', password: '' });
  const [showPass, setShowPass]     = useState(false);
  const [errors, setErrors]         = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email)                    e.email    = 'Email is required';
    else if (!EMAIL_RE.test(form.email)) e.email   = 'Enter a valid email address';
    if (!form.password)                 e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (ev) =>
    setForm((f) => ({ ...f, [ev.target.name]: ev.target.value }));

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to report and track local problems.">
      <form className="as-form" onSubmit={handleSubmit} noValidate>

        {serverError && (
          <div className="alert alert--error" role="alert">
            <AlertCircle size={15} aria-hidden="true" />
            {serverError}
          </div>
        )}

        <div className="field">
          <label className="field__label" htmlFor="email">Email address</label>
          <input
            id="email" name="email" type="email" autoComplete="email"
            value={form.email} onChange={handleChange}
            className={errors.email ? 'input input--error' : 'input'}
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <span id="email-error" className="field__error" role="alert">
              <AlertCircle size={12} aria-hidden="true" /> {errors.email}
            </span>
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="password">Password</label>
          <div className="input-wrap">
            <input
              id="password" name="password"
              type={showPass ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.password} onChange={handleChange}
              className={errors.password ? 'input input--error' : 'input'}
              aria-describedby={errors.password ? 'password-error' : undefined}
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              className="input-wrap__toggle"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass
                ? <EyeOff size={16} aria-hidden="true" />
                : <Eye size={16} aria-hidden="true" />}
            </button>
          </div>
          {errors.password && (
            <span id="password-error" className="field__error" role="alert">
              <AlertCircle size={12} aria-hidden="true" /> {errors.password}
            </span>
          )}
        </div>

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting && <Loader2 size={15} className="spin" aria-hidden="true" />}
          {submitting ? 'Logging in…' : 'Log in'}
        </button>

        <p className="as-switch">
          No account? <Link to="/register">Create one free</Link>
        </p>
      </form>
    </AuthShell>
  );
}
