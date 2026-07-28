import { useState, useEffect } from 'react';
import { PersonalInfoForm } from '../components/PersonalInfoForm';
import { SecurityForm } from '../components/SecurityForm';
import { PreferencesForm } from '../components/PreferencesForm';
import { IntegrationsSettings } from '../components/IntegrationsSettings';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';

export const Settings = () => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('personal-info');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['personal-info', 'preferences', 'integrations', 'security'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    const scrollContainer = document.getElementById('main-scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  const navItems = [
    { id: 'personal-info', label: t('profile.menu.personal_info') },
    { id: 'preferences', label: t('profile.menu.preferences') },
    { id: 'integrations', label: t('profile.menu.integrations') },
    { id: 'security', label: t('profile.menu.security') },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-text-main tracking-tight">Settings</h1>
        <p className="text-brand-text-muted mt-2">{t('profile.description')}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-10 items-start">
        
        {/* Menu latéral (Sticky sur Desktop, Scroll horizontal sur Mobile) */}
        <nav className="w-full md:w-64 shrink-0 md:sticky md:top-8 flex md:flex-col overflow-x-auto md:overflow-visible space-x-2 md:space-x-0 md:space-y-1 pb-2 md:pb-0 scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={`flex-none md:w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === item.id
                  ? 'bg-blue-50 text-brand-primary'
                  : 'text-brand-text-muted hover:bg-slate-100 hover:text-brand-text-main'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Sections du formulaire empilées */}
        <div className="flex-1 space-y-12 max-w-3xl w-full pb-64">
          <section id="personal-info" className="scroll-mt-8">
            <PersonalInfoForm />
          </section>
          
          <section id="preferences" className="scroll-mt-8">
            <PreferencesForm />
          </section>
          
          <section id="integrations" className="scroll-mt-8">
            <IntegrationsSettings />
          </section>

          <section id="security" className="scroll-mt-8">
            <SecurityForm />
          </section>
        </div>

      </div>
    </DashboardLayout>
  );
};
