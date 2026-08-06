import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { updateProfileInfo } from '../api/settingsApi';
import { User, Mail, Save, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { apiFetch } from '../../../api/apiClient';

export const PersonalInfoForm = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const hasChanges = name !== user?.name || email !== user?.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (name === user?.name && email === user?.email) {
        setIsLoading(false);
        return;
      }
      
      const updatedUser = await updateProfileInfo({ name, email });
      updateUser(updatedUser as any);
      
      if ((updatedUser as any).pending_email) {
        setSuccess(`Un code de vérification a été envoyé à ${(updatedUser as any).pending_email}.`);
      } else {
        setSuccess(t('personal_info.success'));
      }

    } catch (err: any) {
      setError(err.message || t('personal_info.error_save'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!user?.pending_email) return;
    setIsVerifying(true);
    setError('');
    setSuccess('');
    
    try {
      await apiFetch('/api/auth/verify-email', {
        data: { email: user.pending_email, code: verificationCode }
      });
      
      const refreshedUser = await apiFetch('/api/auth/me');
      updateUser(refreshedUser as any);
      setEmail((refreshedUser as any).email);
      setVerificationCode('');
      setSuccess("L'adresse email a été mise à jour avec succès.");
    } catch (err: any) {
      setError(err.message || "Code de vérification invalide.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="w-5 h-5 mr-2 text-brand-primary" />
          {t('personal_info.title')}
        </CardTitle>
      </CardHeader>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center text-sm">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center text-sm">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('personal_info.name_label')}</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
              placeholder={t('personal_info.name_placeholder')}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('personal_info.email_label')}</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
              placeholder={t('personal_info.email_placeholder')}
              required
            />
          </div>
        </div>

        {hasChanges && (
          <Button
            type="submit"
            disabled={isLoading || !!user?.pending_email}
            className="w-full sm:w-auto mt-4"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t('personal_info.save_btn')}
              </>
            )}
          </Button>
        )}
      </form>

      {user?.pending_email && (
        <div className="mt-8 p-5 bg-blue-50 border border-blue-100 rounded-xl">
          <div className="flex items-center mb-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-sm font-semibold text-blue-900">Validation requise</h3>
          </div>
          <p className="text-sm text-blue-800 mb-4">
            Pour des raisons de sécurité, nous avons envoyé un code de validation à <strong>{user.pending_email}</strong>. 
            Veuillez entrer ce code pour finaliser le changement de votre adresse email.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Code à 6 chiffres"
              className="flex-1 p-2.5 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono tracking-widest text-center sm:text-left"
            />
            <Button
              type="button"
              onClick={handleVerifyEmail}
              disabled={isVerifying || verificationCode.length !== 6}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              {isVerifying ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                "Valider l'email"
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
