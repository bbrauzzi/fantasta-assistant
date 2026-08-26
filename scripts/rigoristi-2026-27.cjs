/* ============================================================
   Rigoristi e tiratori di punizioni della Serie A 2026/27.

   Raccolti a mano il 21 agosto 2026 da tre fonti indipendenti, riverificati il
   27 agosto 2026: nessuna gerarchia principale cambiata, tranne il Milan
   (Nkunku ceduto in prestito al Lipsia il 25 agosto, tolto dai rigoristi/
   punizioni — vedi sotto):
   - fantacalciopedia.com/articoli-fcp/consigli-fantacalcio/216-rigoristi-e-tiratori-2026-27.html
   - calciodangolo.com/fantacalcio-rigoristi-serie-a-2026-2027-chi-tira-rigori/
   - fantamaster.it/tiratori-punizioni-corner-seriea-2026-2027-gerarchie-fantacalcio/

   `rigori` e' la gerarchia dal dischetto in ordine: il primo e' la prima scelta.
   `rigoriContesi: true` significa che le fonti NON concordano su chi tira per
   primo: in quel caso i primi due vanno marcati come incerti, perche' la
   gerarchia si vedra' solo nelle prime giornate. Il mercato chiude il 1
   settembre, quindi queste liste vanno riviste a ridosso dell'asta.

   `punizioni` sono gli specialisti dei calci piazzati (non i corner).
   ============================================================ */

module.exports = {
  Atalanta: {
    rigori: ['Scamacca', 'De Ketelaere', 'Krstovic', 'Samardzic'],
    rigoriContesi: true, // Scamacca per fantacalciopedia, De Ketelaere per calciodangolo
    punizioni: ['De Ketelaere', 'Samardzic', 'Gaetano', 'Raspadori'],
  },
  Bologna: {
    rigori: ['Orsolini', 'Dovbyk', 'Bernardeschi'],
    rigoriContesi: true, // Orsolini per fantacalciopedia, Dovbyk per calciodangolo
    punizioni: ['Orsolini', 'Bernardeschi'],
  },
  Cagliari: {
    rigori: ['Fazzini', 'Mina', 'Winks'],
    punizioni: ['Maldini', 'Fazzini', 'Winks'],
  },
  Como: {
    rigori: ['Da Cunha', 'Douvikas', 'Paz N.'],
    punizioni: ['Paz N.', 'Baturina', 'Da Cunha', 'Perrone'],
  },
  Fiorentina: {
    rigori: ['Gudmundsson A.', 'Kean', 'Mandragora'],
    rigoriContesi: true, // Gudmundsson per fantacalciopedia, Kean per calciodangolo
    punizioni: ['Gudmundsson A.', 'Mastantuono', 'Mandragora', 'Fagioli'],
  },
  Frosinone: {
    rigori: ['Calo', 'Raimondo'],
    punizioni: ['Calo', 'Ghedjemis', 'Kvernadze'],
  },
  Genoa: {
    rigori: ['Colombo', 'Vitinha', 'Messias'],
    punizioni: ['Baldanzi', 'Messias', 'Frendrup'],
  },
  Inter: {
    rigori: ['Calhanoglu', 'Zielinski', 'Martinez L.'],
    punizioni: ['Calhanoglu', 'Dimarco', 'Zielinski'],
  },
  Juventus: {
    rigori: ['Yildiz', 'Kolo Muani', 'Locatelli'],
    rigoriContesi: true, // le tre fonti si contraddicono fra Yildiz, Kolo Muani e Locatelli
    punizioni: ['Yildiz', 'Locatelli', 'Koopmeiners'],
  },
  Lazio: {
    rigori: ['Zaccagni', 'Cataldi', 'Taylor'],
    punizioni: ['Zaccagni', 'Cataldi', 'Taylor', 'Rovella'],
  },
  Lecce: {
    rigori: ['Geubbels', 'Stulic', 'Pierotti'],
    punizioni: ['Pierotti', 'Berisha', 'Gallo'],
  },
  Milan: {
    // Nkunku ceduto in prestito al Lipsia il 25 agosto 2026: la contesa con
    // Pulisic (fantacalciopedia lo dava primo, calciodangolo dava Pulisic) e'
    // risolta, Pulisic resta l'unico rigorista accreditato.
    rigori: ['Pulisic', 'Ramos G.'],
    punizioni: ['Modric', 'Pulisic'],
  },
  Monza: {
    rigori: ['Pessina', 'Cutrone'],
    punizioni: ['Colpani', 'Pessina', 'Ciurria'],
  },
  Napoli: {
    rigori: ['De Bruyne', 'Hojlund', 'McTominay'],
    punizioni: ['De Bruyne', 'Politano', 'Neres'],
  },
  Parma: {
    // fantacalciopedia dava Pellegrino come prima scelta, ma nel listino
    // ufficiale del 21 agosto Pellegrino M. risulta alla Fiorentina: e' stato
    // venduto. Resta Bernabe, su cui l'altra fonte concordava gia'.
    rigori: ['Bernabe', 'Valeri', 'Nicolussi Caviglia'],
    punizioni: ['Bernabe', 'Nicolussi Caviglia', 'Valeri'],
  },
  Roma: {
    rigori: ['Malen', 'Dybala', 'Soule'],
    punizioni: ['Dybala', 'Soule', 'Pellegrini Lo.'],
  },
  Sassuolo: {
    rigori: ['Berardi', 'Pinamonti', 'Lauriente'],
    punizioni: ['Berardi', 'Lauriente', 'Thorstvedt'],
  },
  Torino: {
    rigori: ['Vlasic', 'Zapata', 'Simeone'],
    punizioni: ['Vlasic', 'Oristanio'],
  },
  Udinese: {
    rigori: ['Davis K.', 'Zaniolo', 'Solet'],
    punizioni: ['Zaniolo', 'Ekkelenkamp', 'Vojvoda', 'Miller'],
  },
  Venezia: {
    rigori: ['Adams A.', 'Rrahmani', 'Adorante'],
    rigoriContesi: true, // Rrahmani per fantacalciopedia, Akor Adams per calciodangolo
    punizioni: ['Busio', 'Basic', 'Yeboah'],
  },
};
