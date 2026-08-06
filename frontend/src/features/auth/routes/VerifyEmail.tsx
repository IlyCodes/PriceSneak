import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { apiFetch } from '../../../api/apiClient';
import { useTranslation } from 'react-i18next';

export const VerifyEmail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email');
  
  const [email, setEmail] = useState(emailParam || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await apiFetch('/api/auth/verify-email', {
        data: { email, code },
      });

      setSuccess(t('auth.verify_success', 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.'));
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err: any) {
      setError(err.message || t('auth.verify_error', 'Code de vérification invalide.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setResending(true);

    try {
      await apiFetch('/api/auth/resend-verification', {
        data: { email },
      });
      setSuccess(t('auth.verify_resend_success', 'Un nouveau code a été envoyé à votre adresse email.'));
    } catch (err: any) {
      setError(err.message || t('auth.verify_resend_error', 'Erreur lors de l\'envoi du nouveau code.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-gray-900">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{t('auth.verify_title', 'Vérifiez votre email')}</h2>
          <p className="text-gray-500 mt-2 text-sm">
            {t('auth.verify_subtitle', 'Nous avons envoyé un code à 6 chiffres à ')} 
            <span className="font-semibold text-gray-700">{email}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <p className="text-sm text-emerald-600">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.verify_code_label', 'Code de vérification (6 chiffres)')}</label>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} // Only allow digits
              className="block w-full px-3 py-3 text-center text-2xl tracking-widest bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none"
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                {t('auth.verify_btn', 'Vérifier')}
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-2">
            {t('auth.verify_no_code', 'Vous n\'avez pas reçu le code ?')}
          </p>
          <button
            onClick={handleResend}
            disabled={resending}
            className="font-medium text-sm text-blue-600 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending ? t('auth.verify_resending', 'Envoi en cours...') : t('auth.verify_resend_link', 'Renvoyer le code')}
          </button>
        </div>
        
        <div className="mt-6 text-center border-t border-gray-100 pt-6">
          <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            {t('auth.back_to_login', 'Retour à la connexion')}
          </Link>
        </div>
      </div>
    </div>
  );
};
