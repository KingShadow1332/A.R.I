/* A.R.I - Event-Ankuendigungen (TruckersMP -> WhatsApp / Discord): reine Logik ohne Oberflaeche.
   Event-Daten lesen, Zeiten (Europe/Berlin inkl. Sommer-/Winterzeit), Flaggen, Text im Discord- und WhatsApp-Format, Pruefungen.
   Laeuft in der App (window.AriAnnounce) und in Node (module.exports) - dort zum Testen. */
(function (root) {
  'use strict';
  const A = {};

  /* ---------- Standardwerte der Vorlage (vom Nutzer pro Event aenderbar, werden als Vorlage gemerkt) ---------- */
  A.DEFAULT_TEMPLATE = {
    role: '<@&738378670875607051>',        // Discord-Rollen-Erwaehnung (nur im Discord-Text)
    lead: 'CEO | HR',                       // Fuehrungsfahrzeug RSL / Lead vehicle RSL
    ts: 'v-spedition.de',                   // Event-TeamSpeak-IP
    dh: 'https://hub.v-spedition.de/event', // DH event calendar
    reward: '500 Points',
    paintText: 'Truck (blue; 06db6) + Trailer (Emberstorm; white - blue - blue - blue; 06db6):',
    paintImg: 'https://i.ibb.co/LDzh7vyD/TMPLivery2026.png',
    maxWeight: '15 t',
    playertagRgb: '0 - 108 - 182',
    playertag: 'RSL | Driver',
    eveningHour: 22,                        // Ankuendigung am Vortag um 22:00 Uhr (Berlin)
    minutesBefore: 120,                     // und 2 Stunden vor Event-Beginn
  };

  /* ---------- Event-Link / ID ---------- */
  A.parseEventId = function (input) {
    const m = String(input || '').match(/events\/(\d+)/i) || String(input || '').match(/^\s*(\d{3,})\s*$/);
    return m ? m[1] : null;
  };

  /* ---------- Zeit (Europe/Berlin) ---------- */
  const dtfCache = {};
  function dtf(opts) { const k = JSON.stringify(opts); return dtfCache[k] || (dtfCache[k] = new Intl.DateTimeFormat('en-GB', opts)); }
  function partsInBerlin(date) {
    const p = {};
    dtf({ timeZone: 'Europe/Berlin', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(date).forEach(x => { if (x.type !== 'literal') p[x.type] = parseInt(x.value, 10); });
    return p;
  }
  A.berlinOffsetMin = function (date) {
    const p = partsInBerlin(date);
    return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  };
  A.berlinToUtc = function (y, mo, d, h, mi) {
    let t = Date.UTC(y, mo - 1, d, h, mi);
    for (let i = 0; i < 3; i++) t = Date.UTC(y, mo - 1, d, h, mi) - A.berlinOffsetMin(new Date(t)) * 60000;
    return new Date(t);
  };
  A.tmpTime = function (s) {            // "2026-10-06 17:00:00" (UTC) -> Date
    const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))) : null;
  };
  const pad = n => String(n).padStart(2, '0');
  A.fmtBerlin = function (date) {       // {date:'06.10.2026', time:'19:00', tz:'CEST', day:'2026-10-06'}
    const p = partsInBerlin(date), off = A.berlinOffsetMin(date);
    return { date: pad(p.day) + '.' + pad(p.month) + '.' + p.year, time: pad(p.hour) + ':' + pad(p.minute), tz: off === 120 ? 'CEST' : off === 60 ? 'CET' : 'UTC' + (off >= 0 ? '+' : '') + off / 60, day: p.year + '-' + pad(p.month) + '-' + pad(p.day) };
  };
  A.fmtUtc = function (date) { return pad(date.getUTCHours()) + ':' + pad(date.getUTCMinutes()); };
  function dayNumber(isoDay) { const m = isoDay.split('-').map(Number); return Math.round(Date.UTC(m[0], m[1] - 1, m[2]) / 86400000); }
  A.dayLabel = function (sendAt, eventStart) {   // "TODAY/HEUTE" / "TOMORROW/MORGEN" / Datum
    const diff = dayNumber(A.fmtBerlin(eventStart).day) - dayNumber(A.fmtBerlin(sendAt).day);
    return diff === 0 ? 'TODAY/HEUTE' : diff === 1 ? 'TOMORROW/MORGEN' : A.fmtBerlin(eventStart).date;
  };

  /* Die zwei Sendetermine: Vortag 22:00 (Berlin) und 2 Stunden vor Event-Beginn (= Abfahrt, start_at). */
  A.plan = function (startUtc, tpl, now) {
    tpl = Object.assign({}, A.DEFAULT_TEMPLATE, tpl || {});
    const f = A.fmtBerlin(startUtc), [y, mo, d] = f.day.split('-').map(Number);
    const prev = new Date(Date.UTC(y, mo - 1, d - 1));
    const evening = A.berlinToUtc(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate(), tpl.eveningHour, 0);
    const before = new Date(startUtc.getTime() - tpl.minutesBefore * 60000);
    const items = [
      { key: 'evening', title: 'Am Vortag ' + pad(tpl.eveningHour) + ':00', at: evening },
      { key: 'before', title: Math.round(tpl.minutesBefore / 60 * 10) / 10 + ' Std. vor Beginn', at: before },
    ];
    items.forEach(i => { i.label = A.dayLabel(i.at, startUtc); i.past = !!now && i.at.getTime() <= now.getTime(); });
    return items;
  };

  /* ---------- Flaggen ---------- */
  const COUNTRY_CITIES = {
    DE: 'berlin hamburg bremen hannover koln dusseldorf dortmund essen frankfurt stuttgart munchen nurnberg leipzig dresden kassel magdeburg rostock kiel lubeck osnabruck duisburg erfurt mannheim karlsruhe freiburg wurzburg augsburg regensburg passau saarbrucken gottingen hof flensburg schwerin cottbus wolfsburg bielefeld munster bonn bochum chemnitz halle ulm trier koblenz mainz wiesbaden braunschweig oldenburg paderborn bamberg bayreuth rosenheim lindau',
    FR: 'paris lyon marseille toulouse nice bordeaux lille nantes strasbourg rennes le_havre calais dijon reims metz orleans limoges clermont-ferrand montpellier brest cherbourg caen rouen grenoble perpignan brive nimes avignon toulon amiens poitiers tours angers le mans besancon mulhouse nancy dunkerque saint-malo la_rochelle bayonne pau tarbes biarritz lorient quimper valence chambery annecy auxerre troyes',
    ES: 'madrid barcelona valencia sevilla seville zaragoza malaga bilbao murcia granada cordoba salamanca valladolid burgos albacete alicante almeria badajoz cadiz santander a_coruna vigo pamplona algeciras huelva jaen toledo leon tarragona ciudad_real puertollano bailen mengibar almaraz teruel cuenca gijon oviedo lleida girona castellon cartagena logrono san_sebastian zamora palencia avila segovia caceres merida linares lugo ourense pontevedra santiago_de_compostela vitoria irun guadalajara talavera jerez motril alcazar_de_san_juan benidorm elche',
    PT: 'lisboa lisbon porto faro coimbra braga evora sines setubal aveiro viseu guarda braganca castelo_branco leiria beja portalegre vila_real figueira_da_foz santarem viana_do_castelo',
    IT: 'roma milano napoli torino genova bologna firenze venezia bari palermo catania trieste verona trento bolzano ancona perugia pescara livorno taranto reggio_calabria cagliari messina siracusa brescia bergamo padova udine rimini parma modena la_spezia salerno foggia lecce brindisi pisa aosta sassari olbia',
    GB: 'london manchester birmingham liverpool leeds edinburgh glasgow cardiff dover southampton bristol newcastle sheffield aberdeen plymouth carlisle felixstowe harwich hull nottingham cambridge inverness swansea folkestone portsmouth grimsby belfast stranraer holyhead fishguard pembroke milford_haven norwich oxford exeter leicester coventry middlesbrough dundee perth fort_william ipswich lincoln',
    IE: 'dublin cork galway limerick waterford sligo rosslare kilkenny dundalk tralee letterkenny athlone drogheda killarney',
    PL: 'warszawa warsaw krakow lodz wroclaw poznan gdansk szczecin katowice lublin bialystok rzeszow olsztyn bydgoszcz gdynia torun kielce opole zielona_gora gorzow koszalin radom suwalki swinoujscie',
    CZ: 'praha prague brno ostrava plzen olomouc liberec ceske_budejovice hradec_kralove pardubice jihlava karlovy_vary usti_nad_labem zlin',
    SK: 'bratislava kosice zilina nitra presov banska_bystrica trencin trnava poprad',
    HU: 'budapest debrecen pecs szeged gyor miskolc szekesfehervar nyiregyhaza kecskemet sopron veszprem szombathely',
    AT: 'wien vienna graz linz salzburg innsbruck klagenfurt villach bregenz st._polten sankt_polten',
    CH: 'bern zurich geneve geneva basel lausanne lugano st._gallen luzern chur',
    BE: 'bruxelles brussel brussels antwerpen antwerp liege gent brugge charleroi namur arlon hasselt mons',
    NL: 'amsterdam rotterdam utrecht eindhoven groningen den_haag the_hague arnhem maastricht zwolle breda enschede vlissingen almere',
    LU: 'luxembourg luxemburg',
    DK: 'kobenhavn copenhagen aarhus odense aalborg esbjerg frederikshavn hirtshals fredericia kolding rodby grenaa',
    SE: 'stockholm goteborg gothenburg malmo uppsala orebro jonkoping linkoping vasteras umea lulea helsingborg karlskrona kalmar norrkoping sundsvall kiruna ostersund halmstad trelleborg karlstad vaxjo gavle',
    NO: 'oslo bergen trondheim stavanger kristiansand tromso narvik bodo alta kirkenes lillehammer drammen skien fredrikstad haugesund alesund molde hammerfest',
    FI: 'helsinki tampere turku oulu kemi rovaniemi vaasa jyvaskyla lahti kuopio kotka vantaa pori joensuu kajaani mikkeli salla ivalo',
    EE: 'tallinn tartu narva parnu',
    LV: 'riga daugavpils liepaja ventspils jelgava valmiera rezekne',
    LT: 'vilnius kaunas klaipeda siauliai panevezys alytus marijampole utena',
    RU: 'kaliningrad sankt-peterburg saint_petersburg moskva moscow vyborg pskov',
    BY: 'minsk brest grodno vitebsk gomel',
    UA: 'kyiv kiev lviv odesa kharkiv uzhhorod chop',
    RO: 'bucuresti bucharest cluj-napoca timisoara constanta iasi brasov craiova sibiu oradea arad galati ploiesti suceava targu_mures baia_mare',
    BG: 'sofia varna plovdiv burgas ruse veliko_tarnovo pleven vidin stara_zagora sliven',
    TR: 'istanbul edirne canakkale bursa ankara izmir kapikule',
    GR: 'athina athens thessaloniki patra ioannina igoumenitsa alexandroupoli kavala larissa volos korinthos kalamata heraklion kozani xanthi',
    RS: 'beograd belgrade novi_sad nis kragujevac subotica',
    HR: 'zagreb split rijeka osijek zadar dubrovnik pula slavonski_brod varazdin',
    SI: 'ljubljana maribor koper celje kranj nova_gorica',
    BA: 'sarajevo banja_luka mostar tuzla zenica',
    ME: 'podgorica niksic bar budva',
    MK: 'skopje bitola ohrid',
    AL: 'tirana durres vlore shkoder',
    XK: 'prishtina pristina prizren',
    IS: 'reykjavik akureyri egilsstadir isafjordur seydisfjordur keflavik selfoss hofn',
    MD: 'chisinau balti',
    MA: 'tanger tangier ceuta',
  };
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ø/g, 'o').replace(/ł/g, 'l').replace(/ı/g, 'i').replace(/ß/g, 'ss').replace(/\s+/g, ' ').trim();
  const CITY_ISO = {};
  Object.entries(COUNTRY_CITIES).forEach(([iso, list]) => {
    list.split(' ').forEach(w => { if (w) CITY_ISO[w.replace(/_/g, ' ')] = CITY_ISO[w.replace(/_/g, ' ')] || iso; });
  });
  A.countryOf = function (city) { return CITY_ISO[norm(city)] || null; };
  A.flagEmoji = function (iso) {
    if (!/^[A-Za-z]{2}$/.test(iso || '')) return '';
    return String.fromCodePoint(...iso.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  };

  /* ---------- Text ---------- */
  // Reihenfolge der DLC-Namen wie in den bisherigen Ankuendigungen des Nutzers; Unbekannte kommen dahinter in API-Reihenfolge.
  const DLC_ORDER = ['Road to the Black Sea', 'Iberia', 'West Balkans', 'Feldbinder Trailer Pack', 'Going East!', 'Greece', 'Nordic Horizons', 'Scandinavia', 'Iceland',
    'Isle of Ireland', 'Vive la France !', 'Italia', 'Beyond the Baltic Sea', 'Krone Trailer Pack'];
  A.sortDlcs = function (names) {
    const idx = n => { const i = DLC_ORDER.indexOf(n); return i < 0 ? 999 : i; };
    return names.map((n, i) => [n, i]).sort((x, y) => idx(x[0]) - idx(y[0]) || x[1] - y[1]).map(x => x[0]);
  };

  A.fmtKm = function (km) { const n = Number(String(km).replace(',', '.')); return isFinite(n) && n > 0 ? Math.round(n).toLocaleString('de-DE') + ' km' : '0 km'; };

  function place(loc, flagOverride) {   // "Valencia 🇪🇸, Norrsken"
    const iso = flagOverride || A.countryOf(loc.city);
    return (loc.city || '?') + (iso ? ' ' + A.flagEmoji(iso) : '') + (loc.location ? ', ' + loc.location : '');
  }

  /* ev = Event-Objekt der TruckersMP-API (response), state = {tpl, lengthKm, flagFrom, flagTo, sendAt} */
  A.buildText = function (platform, ev, state) {
    const t = Object.assign({}, A.DEFAULT_TEMPLATE, state.tpl || {});
    const discord = platform === 'discord';
    const b = s => discord ? '**' + s + '**' : '*' + s + '*';
    const meet = A.tmpTime(ev.meetup_at), start = A.tmpTime(ev.start_at);
    const fm = meet ? A.fmtBerlin(meet) : null, fs = start ? A.fmtBerlin(start) : null;
    const label = state.sendAt && start ? A.dayLabel(state.sendAt, start) : 'TOMORROW/MORGEN';
    const dlcs = ev.dlcs ? A.sortDlcs(Object.values(ev.dlcs)).join(', ') : '';
    const evUrl = ev.url ? 'https://truckersmp.com' + String(ev.url).replace(/#.*$/, '').replace(/^(\/events\/\d+).*$/, '$1') : '';
    const L = [];
    L.push('📢 ' + b('+++ Upcoming Event: ' + String(ev.name || '').toUpperCase() + ' - ' + label + ' +++') + ' 📢');
    if (discord && t.role) L.push(t.role);
    L.push('🚛 ' + b('Veranstalter/Organizer:') + ' ' + ((ev.vtc && ev.vtc.name) || ev.organizer || ''));
    L.push('🙎🏻‍♂️ ' + b('Führungsfahrzeug RSL/Lead vehicle RSL:') + ' ' + t.lead);
    L.push('🗣️ ' + b('Event-TeamSpeak-IP:') + ' ' + t.ts);
    L.push('');
    L.push('🗓️ ' + b('Datum/Date:') + ' ' + (fs ? fs.date : '?'));
    L.push('🌐 ' + b('Server:') + ' ' + ((ev.server && ev.server.name) || ''));
    L.push('🌎 ' + b('DLC:') + ' ' + dlcs);
    L.push('');
    L.push('🛜 ' + b('TMP:') + ' ' + evUrl);
    L.push('👥 ' + b('DH event calendar:') + ' ' + t.dh);
    L.push('🏆 ' + b('Belohnung/Reward Drivers Hub:') + ' ' + t.reward);
    L.push('');
    L.push('📍 ' + b('Treffpunkt/Meeting:') + ' ' + (fm ? fm.time + ' ' + fm.tz : '?') + ', ' + place(ev.departure || {}, state.flagFrom));
    L.push('🕖 ' + b('Abfahrt/Departure:') + ' ' + (fs ? fs.time + ' ' + fs.tz + ', (' + A.fmtUtc(start) + ' UTC)' : '?'));
    L.push('');
    L.push('🏁 ' + b('Ziel/Destination:') + ' ' + place(ev.arrive || {}, state.flagTo));
    L.push('');
    L.push('📏 ' + b('Länge/Length:') + ' ' + A.fmtKm(state.lengthKm));
    L.push('');
    L.push('❕ ' + b('Lackierung für das Event/Paintjob for the event:') + ' ❕');
    L.push('');
    L.push('🎨 ' + t.paintText);
    if (discord) L.push('');
    L.push(t.paintImg);
    L.push('');
    L.push('⚖️ ' + b('Max. Ladegewicht/Max. loading weight:') + ' ' + t.maxWeight);
    L.push('');
    L.push('🔵 ' + b('Playertag (RGB: ' + t.playertagRgb + '):') + ' ' + t.playertag);
    L.push('');
    L.push('🛑 ' + b('Überholen verboten/Overtaking prohibited'));
    L.push('');
    L.push('⛽ ' + b('Bitte aufgetankt und repariert erscheinen/Please make sure to repair and fill up your truck'));
    return L.join('\n');
  };

  /* ---------- Pruefungen ---------- */
  /* Gibt {errors:[], warnings:[]} zurueck. Fehler blockieren das automatische Senden; Warnungen nur anzeigen. */
  A.check = function (ev, state, now) {
    const errors = [], warnings = [];
    state = state || {}; now = now || new Date();
    if (!ev || !ev.name) { errors.push('Das Event wurde nicht gefunden - ist der Link richtig?'); return { errors, warnings }; }
    const start = A.tmpTime(ev.start_at), meet = A.tmpTime(ev.meetup_at);
    if (!start) errors.push('Das Event hat keine Abfahrtszeit.');
    if (!meet) warnings.push('Das Event hat keine Treffpunkt-Zeit.');
    if (start && start.getTime() <= now.getTime()) errors.push('Das Event hat schon begonnen / liegt in der Vergangenheit.');
    const km = Number(String(state.lengthKm == null ? '' : state.lengthKm).replace(',', '.'));
    if (!isFinite(km) || km <= 0) errors.push('Die Länge (km) fehlt oder ist 0 - bitte aus dem Routenbild lesen lassen oder von Hand eintragen.');
    [['Treffpunkt', ev.departure, state.flagFrom], ['Ziel', ev.arrive, state.flagTo]].forEach(([n, loc, over]) => {
      if (!loc || !loc.city) { errors.push(n + ': Ort fehlt im Event.'); return; }
      if (!over && !A.countryOf(loc.city)) errors.push('Die Flagge für „' + loc.city + '“ (' + n + ') ist unbekannt - bitte das Land auswählen.');
    });
    if (!ev.map) warnings.push('Das Event hat kein Routenbild - es wird ohne Bild gesendet (oder lade einen Screenshot hoch).');
    if (!ev.dlcs || !Object.keys(ev.dlcs).length) warnings.push('Keine DLCs im Event angegeben.');
    if (!ev.voice_link) warnings.push('Kein Kommunikations-Link (Discord/TeamSpeak) im Event.');
    if (!state.targets || !(state.targets.whatsapp || state.targets.discord)) warnings.push('Kein Ziel-Chat eingetragen (WhatsApp-Gruppe / Discord-Kanal).');
    const plan = start ? A.plan(start, state.tpl, now) : [];
    if (plan.length && plan.every(p => p.past)) errors.push('Beide Sendezeiten liegen schon in der Vergangenheit.');
    else plan.filter(p => p.past).forEach(p => warnings.push('Die Sendezeit „' + p.title + '“ (' + A.fmtBerlin(p.at).date + ' ' + A.fmtBerlin(p.at).time + ') ist schon vorbei und wird übersprungen.'));
    return { errors, warnings };
  };

  /* Hilfen fuer die Laengen-Erkennung per Bild-KI */
  A.LENGTH_PROMPT = 'Das Bild ist ein Screenshot der Routenplanung aus Euro Truck Simulator 2. Lies den Wert hinter "Streckenlänge" (oder "Route length"/"Distance") ab. Antworte NUR mit der Zahl in Kilometern ohne Einheit und ohne Tausenderpunkt (z.B. 1031). Wenn du ihn nicht sicher lesen kannst, antworte mit 0.';
  A.parseLength = function (text) {
    const m = String(text || '').replace(/\./g, '').replace(',', '.').match(/\d+(?:\.\d+)?/);
    const n = m ? Math.round(parseFloat(m[0])) : 0;
    return n > 0 && n < 20000 ? n : 0;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = A;
  root.AriAnnounce = A;
})(typeof window !== 'undefined' ? window : globalThis);
