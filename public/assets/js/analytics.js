(() => {
  const id = document.querySelector('meta[name="ga4-id"]')?.content;
  if (!/^G-[A-Z0-9]+$/.test(id || '') || !['genialabs.cl', 'www.genialabs.cl'].includes(location.hostname)) return;
  const key = 'genia-analytics-consent';
  let consent;
  try { consent = localStorage.getItem(key); } catch {}
  let loaded = false;
  const allowed = new Set(['generate_lead', 'voice_session_start', 'voice_assistant_use', 'contact_cta_click', 'contact_form_start', 'calculator_use', 'email_click']);
  function load() {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
    window.gtag('js', new Date());
    const campaign = {};
    const query = new URLSearchParams(location.search);
    for (const field of ['source', 'medium', 'name', 'id', 'term', 'content']) {
      const value = query.get('utm_' + (field === 'name' ? 'campaign' : field));
      if (value && /^[a-zA-Z0-9_-]{1,100}$/.test(value)) campaign['campaign_' + field] = value;
    }
    window.gtag('config', id, {...campaign, page_location: location.origin + location.pathname, page_referrer: safeReferrer(), send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false});
    window.gtag('event', 'page_view', {page_location: location.origin + location.pathname, page_referrer: safeReferrer(), page_title: document.title});
    const script = document.createElement('script');
    script.async = true; script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.append(script);
  }
  function safeReferrer() { try { const url = new URL(document.referrer); return url.origin + url.pathname; } catch { return ''; } }
  window.geniaTrack = name => {
    if (consent !== 'accepted' || !allowed.has(name)) return;
    load();
    window.gtag('event', name, {page_location: location.origin + location.pathname, page_referrer: safeReferrer()});
  };
  const panel = document.createElement('section');
  panel.setAttribute('aria-label', 'Preferencias de analítica');
  panel.innerHTML = '<p>¿Nos ayudas a mejorar? Con tu permiso usamos Google Analytics para medir visitas y uso de la web. <a href="/privacidad">Privacidad</a></p><button type="button" data-choice="accepted">Aceptar analítica</button> <button type="button" data-choice="rejected">Rechazar</button>';
  panel.style.cssText = 'position:fixed;bottom:48px;left:12px;right:12px;max-width:540px;padding:20px;background:#fff;color:#14202a;border:1px solid #14202a;box-shadow:0 4px 24px #0002;z-index:10000;font:16px/1.5 sans-serif';
  panel.querySelectorAll('button').forEach(button => {
    button.style.cssText = 'padding:10px;margin-top:12px;border:1px solid #14202a;background:#fff;color:#14202a;cursor:pointer';
    button.onclick = () => {
      const previous = consent;
      consent = button.dataset.choice;
      try { localStorage.setItem(key, consent); } catch {}
      panel.hidden = true;
      if (consent === 'accepted') load();
      else if (previous === 'accepted') {
        window['ga-disable-' + id] = true;
        document.cookie.split(';').forEach(cookie => {
          const name = cookie.split('=')[0].trim();
          if (!/^_ga(?:_|$)/.test(name)) return;
          for (const domain of ['', ';domain=' + location.hostname, ';domain=.genialabs.cl']) document.cookie = name + '=;Max-Age=0;path=/' + domain;
        });
        location.reload();
      }
    };
  });
  const settings = document.createElement('button');
  settings.type = 'button'; settings.textContent = 'Preferencias de analítica';
  settings.style.cssText = 'position:fixed;bottom:8px;left:12px;z-index:9999;background:#fff;color:#14202a;border:1px solid #14202a;padding:6px;font:12px sans-serif;cursor:pointer';
  settings.onclick = () => { panel.hidden = false; };
  panel.hidden = consent === 'accepted' || consent === 'rejected';
  document.body.append(panel, settings);
  if (consent === 'accepted') load();
  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (link?.getAttribute('href')?.startsWith('mailto:')) window.geniaTrack('email_click');
    else if (link?.matches('.ir-al-form, #voiceContact, a[href="#contacto"]')) window.geniaTrack('contact_cta_click');
  });
  document.getElementById('contactForm')?.addEventListener('input', () => window.geniaTrack('contact_form_start'), {once: true});
  document.getElementById('calculadora-form')?.addEventListener('input', () => window.geniaTrack('calculator_use'), {once: true});
})();
