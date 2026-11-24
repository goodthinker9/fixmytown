import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import Logo from '../components/Logo.jsx';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors]         = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 2)
      e.name = 'Full name must be at least 2 characters';
    if (!form.email)                     e.email    = 'Email is required';
    else if (!EMAIL_RE.test(form.email)) e.email    = 'Enter a valid email address';
    if (!form.password)                  e.password = 'Password is required';
    else if (form.password.length < 8)   e.password = 'Password must be at least 8 characters';
    if (form.confirm !== form.password)  e.confirm  = 'Passwords do not match';
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
      await register(form.name.trim(), form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.details) {
        const fieldErrors = {};
        data.details.forEach((d) => { if (d.field) fieldErrors[d.field] = d.message; });
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
        setServerError(data.error || 'Please fix the highlighted fields.');
      } else {
        setServerError(data?.error || 'Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    { id: 'name',     label: 'Full name',        type: 'text',     ac: 'name',         pw: false },
    { id: 'email',    label: 'Email address',    type: 'email',    ac: 'email',        pw: false },
    { id: 'password', label: 'Password',         type: 'password', ac: 'new-password', pw: true,  show: showPass,    setShow: setShowPass },
    { id: 'confirm',  label: 'Confirm password', type: 'password', ac: 'new-password', pw: true,  show: showConfirm, setShow: setShowConfirm },
  ];

  return (
    <div className="auth-page">
      <form className="card auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-form__logo">
          <Logo size={36} />
        </div>
        <h1 className="auth-form__title">Create your account</h1>
        <p className="auth-form__sub">Free forever. Report issues in your community.</p>

        {serverError && (
          <div className="alert alert--error" role="alert">
            <AlertCircle size={15} aria-hidden="true" /> {serverError}
          </div>
        )}

        {fields.map(({ id, label, type, ac, pw, show, setShow }) => (
          <div className="field" key={id}>
            <label className="field__label" htmlFor={id}>{label}</label>
            {pw ? (
              <div className="input-wrap">
                <input
                  id={id} name={id}
                  type={show ? 'text' : 'password'}
                  autoComplete={ac}
                  value={form[id]} onChange={handleChange}
                  className={errors[id] ? 'input input--error' : 'input'}
                  aria-describedby={errors[id] ? `${id}-error` : undefined}
                  aria-invalid={!!errors[id]}
                />
                <button
                  type="button"
                  className="input-wrap__toggle"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? `Hide ${label}` : `Show ${label}`}
                >
                  {show
                    ? <EyeOff size={16} aria-hidden="true" />
                    : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            ) : (
              <input
                id={id} name={id} type={type} autoComplete={ac}
                value={form[id]} onChange={handleChange}
                className={errors[id] ? 'input input--error' : 'input'}
                aria-describedby={errors[id] ? `${id}-error` : undefined}
                aria-invalid={!!errors[id]}
              />
            )}
            {id === 'password' && !errors.password && (
              <span className="field__hint">Minimum 8 characters.</span>
            )}
            {errors[id] && (
              <span id={`${id}-error`} className="field__error" role="alert">
                <AlertCircle size={12} aria-hidden="true" /> {errors[id]}
              </span>
            )}
          </div>
        ))}

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting && <Loader2 size={15} className="spin" aria-hidden="true" />}
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="auth-form__switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
