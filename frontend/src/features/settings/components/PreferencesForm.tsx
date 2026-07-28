import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings, type UserSettings } from '../api/settingsApi';
import { Settings, Save, AlertCircle, CheckCircle2, Globe, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Switch } from '../../../components/ui/Switch';
import { useAuth } from '../../auth/context/AuthContext';

export const PreferencesForm = () => {
  const { t, i18n } = useTranslation();
  const { updateCurrency } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getSettings();
        setSettings(data);
      } catch {
        setError(t('preferences.error_load'));
      } finally {
        setIsFetching(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      i18n.changeLanguage(updated.language.toLowerCase());
      updateCurrency(updated.currency);
      setSuccess(t('preferences.success'));
    } catch (err: any) {
      setError(err.message || t('preferences.error_save'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <div className="p-6 text-center text-slate-500 animate-pulse">Chargement des préférences...</div>;
  }

  if (!settings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="w-5 h-5 mr-2 text-brand-primary" />
          {t('preferences.title')}
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col gap-8">
          
          {/* Région et Langue */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 flex items-center">
              <Globe className="w-4 h-4 mr-2 text-slate-400"/> {t('preferences.region_language')}
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('preferences.currency_label')}</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white"
              >
                <option value="EUR">Euro (€)</option>
                <option value="USD">Dollar US ($)</option>
                <option value="GBP">Livre Sterling (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('preferences.language_label')}</label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white"
              >
                <option value="FR">Français</option>
                <option value="ENG">Anglais</option>
              </select>
            </div>
          </div>

          {/* Notifications */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 flex items-center">
              <Bell className="w-4 h-4 mr-2 text-slate-400"/> {t('preferences.notifications')}
            </h3>
            
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <div>
                <span className="block text-sm font-medium text-slate-800">{t('preferences.dashboard_alerts')}</span>
                <span className="block text-xs text-slate-500">{t('preferences.dashboard_alerts_desc')}</span>
              </div>
              <Switch
                checked={settings.dashboard_notification}
                onChange={(checked) => setSettings({ ...settings, dashboard_notification: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <div>
                <span className="block text-sm font-medium text-slate-800">{t('preferences.email_alerts')}</span>
                <span className="block text-xs text-slate-500">{t('preferences.email_alerts_desc')}</span>
              </div>
              <Switch
                checked={settings.email_notification}
                onChange={(checked) => setSettings({ ...settings, email_notification: checked })}
              />
            </div>
          </div>

        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {t('preferences.save_btn')}
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};
