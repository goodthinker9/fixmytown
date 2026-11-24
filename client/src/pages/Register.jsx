import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Logo from '../components/Logo.jsx';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 2)
      e.name = 'Name must be at least 2 characters';
    if (!form.email) e.email = 'Email is required';
    else if (!EMAIL_RE.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8)
      e.password = 'Password must be at least 8 characters';
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match';
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
        data.details.forEach((d) => {
          if (d.field) fieldErrors[d.field] = d.message;
        });
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
        setServerError(data.error || 'Please fix the highlighted fields.');
      } else {
        setServerError(data?.error || 'Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-form__logo">
          <Logo size={36} />
        </div>
        <h1 className="auth-form__title">Create your account</h1>

        {serverError && <div className="alert alert--error" role="alert">{serverError}</div>}

        {[
          { id: 'name',     label: 'Name',             type: 'text',     ac: 'name',         err: errors.name },
          { id: 'email',    label: 'Email',            type: 'email',    ac: 'email',        err: errors.email },
          { id: 'password', label: 'Password',         type: 'password', ac: 'new-password', err: errors.password },
          { id: 'confirm',  label: 'Confirm password', type: 'password', ac: 'new-password', err: errors.confirm },
        ].map(({ id, label, type, ac, err }) => (
          <div className="field" key={id}>
            <label className="field__label" htmlFor={id}>{label}</label>
            <input
              id={id}
              name={id}
              type={type}
              autoComplete={ac}
              value={form[id]}
              onChange={handleChange}
              className={err ? 'input input--error' : 'input'}
              aria-describedby={err ? `${id}-error` : undefined}
            />
            {err && <span id={`${id}-error`} className="field__error" role="alert">{err}</span>}
          </div>
        ))}

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Register'}
        </button>

        <p className="auth-form__switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
