# Ainetietojen ja tulostuksen jatkokorjaukset 2.10.2026

Tila: julkaistu testattavaksi osoitteessa https://beta.phasekit.app 2.10.2026, versio 0.4.0-beta.2 / `f5205a3`. Offline-tulostuksen tunnettu puute ja fyysisen iPhonen tarkistus on kuvattu alla.

- Kylmäkierron lämpötilakentät ovat puhelimessa vasemmalla ja kenttien nimet oikealla. Otsikon infopainike on samalla linjalla otsikon kanssa.
- GWP-riveillä on lyhyt nimi ja avattava laskentaperuste. Jos perusteita on useita, lyhyt tunniste erottaa arvot toisistaan.
- Puhtaan aineen koostumus on perustietojen yksittäinen rivi. Seoksissa komponentin nimi on linkki; massaprosentti on tavallinen paikallistetusti esitetty arvo.
- Pitkät ominaisuuksien menetelmä- ja taustatiedot ovat yhteisessä haitarissa. Lyhyt lämpötila-, paine- ja faasitieto säilyy arvon yhteydessä. Kaksoiskappaleena näkyvä menetelmäteksti poistui ja tunnetut faasinimet käännettiin.
- Öljyrivin nimi on Öljytyyppi. Valmistajan ohjeen ensisijaisuus säilyy infotekstissä. Tyhjän vaihtoehtolistan pituudesta syntynyt irrallinen nolla on korjattu boolean-ehdolla.
- Rajoituksen suora Lähde-linkki jätetään pois, jos sama URL on jo Tietojen tausta -haitarissa. Erillistä lähdelinkkiä ei poisteta, jos sen osoite poikkeaa taustalähteistä.
- Kattavuuspainike avaa sovelluksen oman näkymän, jossa on paluu Ominaisuudet-välilehden avaavaan painikkeeseen, navigaatio, ainekohtaiset tiedot ja koko aineiston kattavuus. Englanninkielinen tekninen HTML-raportti säilyy erillisessä lisätietokohdassa.

## Tulostuspainike

Painikkeen toimettomuus on käyttäjän havainto fyysisestä iPhonesta. Sen tarkkaa iOS-kohtaista syytä ei ole vahvistettu.

Vanha esikatselu sitoi painikkeiden tapahtumankäsittelijät avaavan sovellusikkunan JavaScript-ympäristöön. Hallitussa Chromium-kokeessa avaavan ikkunan skriptisuorituksen estäminen (`Emulation.setScriptExecutionDisabled`) esti vanhan käsittelijän, mutta esikatselun omassa ympäristössä luotu käsittelijä toimi.

Tulostus, paluu ja kaaviokuvan latauksen odotus suoritetaan nyt esikatselun omassa ikkunassa. Ohjausskripti on versioidussa koostetiedostossa ja mukana service workerin esivälimuistissa. Tulostuspainike aktivoituu vasta käsittelijöiden ja mahdollisen kaavion valmistuttua.

## Tarkistukset

- TypeScript, ESLint ja Vite-kooste onnistuvat.
- 436 yksikkötestiä läpäisty.
- 38 kohdennettua Chromium/WebKit-selaintestiä läpäisty työpöytä- ja puhelinkoossa: ainetiedot, kattavuus, vertailutuloste, kaavion tulostus ja tulostusnäkymän paluu.
- Viimeistelyn jälkeen 12 ainetieto-, kattavuus- ja tulostusregressiota läpäisty uudelleen. Chromium-testissä taustaikkunan JavaScript estetään; WebKit-testissä avaavan sivun dokumentti korvataan.
- Lämpötilakenttien nykyiset asettelu- ja versiohistorian testit läpäisty. PED-rivin testihaku rajattiin näkyvään tietorivin nimeen, sillä sama nimi löytyy nyt myös suljetun lisätietohaitarin otsikosta.
- Ainetietonäkymän axe-tarkistus läpäisty. Termodynamiikka- ja GWP-osioiden mobiili-WebKit-kuvat tarkistettu.

Fyysisen iPhonen tulostusvalinnan/AirPrintin avautuminen sekä asennetun PWA:n käytännön tulostus on vielä varmistettava laitteella. Selaintestien tulostuskutsun varmennus ei yksin todista sitä.

## Julkaisutarkistuksissa löytyneet korjaukset

- Linuxin mobiili-Chromiumissa CO₂e-laskurin painike ulottui noin 10 px alavalikon alle. Lomakkeen mobiiliväleistä poistettiin 24 px; kontrollien kokoa ja näkyvyysvaatimusta ei pienennetty.
- WebKitin epäonnistuneessa jäljessä Täytös oli tyhjä heti täyttökomennon jälkeen. Erillinen kohdistuskoe vanhassa Deploy Preview'ssa osoitti järjestyksen `main → input → main`; korjatussa versiossa järjestys on `main → input`. Navigaation kohdistus ja vieritys tehdään nyt layout-efektissä ennen käyttökelpoisen lomakkeen piirtämistä. Sama ajoitus tarkistetaan erillisellä regressiotestillä neljässä selainprofiilissa.
- CI:n saman työhaaran push- ja PR-tupla-ajot poistettiin. PR-päivitys käynnistää yhden tarkistuksen, beta/main-pushit omat tarkistuksensa; uusi versio keskeyttää vanhentuneen ajon.
- `pnpm verify` kokoaa paikalliset julkaisutarkistukset yhdeksi komennoksi. Retry-määrää tai hyväksymisrajoja ei väljennetty. Linux-CI säilyy pakollisena ennen julkaisua.
- Koko paikallinen selainajo: 433 läpi, 2 tarkoituksella ohitettu. Viidessä testissä päällekkäinen paikallinen testiajo poisti trace-tiedoston (`ENOENT`); kaikki viisi läpäisivät puhtaan uusinta-ajon. Uusi kohdistusregressio läpäisi erikseen kaikki neljä selainprofiilia. Linux-CI tarkistetaan erikseen.

## Julkaisuehdokkaan varmennus

- Lopullinen PR-ehdokas `fc5935f`: [CI 37005575807](https://github.com/huplifi/phasekit/actions/runs/37005575807) onnistui. 442 selaintestiä läpäistiin ilman retry-kierroksia, 2 ohitettiin tarkoituksella; kaikki aiemmat tarkistusvaiheet läpäistiin.
- Deploy Preview 22 tarkistettiin Chromiumilla ja WebKitillä koossa 390/1440 px: ainetiedot, kattavuus ja paluu, tulostuksen itsenäiset käsittelijät. Ei sivuvirheitä. CO₂e-painikkeelle jäi 390 × 844 px esikatselussa noin 31 px tilaa alavalikon yläpuolelle.
- [PR 22](https://github.com/huplifi/phasekit/pull/22) yhdistettiin betaan commitilla `f5205a3`. Git-puu vastaa täsmälleen testattua `fc5935f`-ehdokasta. Mergen automaattinen uusinta-ajo 37007069178 peruttiin tarkoituksella päällekkäisen testauksen vähentämiseksi.
- Käyttäjän kustannus- ja testausrajaus on kirjattu julkaisuohjeeseen: kohdennetut tarkistukset, yksi laaja julkaisuajo, Netlify-esikatselujen ohitus korjauskierroksilla.

## Julkinen beta ja päivitys

- Julkisen beta-osoitteen näkyvä versio varmennettiin: **0.4.0-beta.2 · f5205a3**.
- Vakaan phasekit.app-sivuston HTML:n SHA-256 säilyi ennallaan: `5de0f2c8173fc526cec75cb0c9175ee3d037c3c2e58b4aec89bbdf9e86982693`.
- Synteettisen vanhan beta.1-selaimen päivityskokeessa päivityskehote ilmestyi, keskeneräinen laskelma pysyi ehjänä ja sen hylkääminen vaati vahvistuksen. Beta.2-version varmuuskopio vastasi täsmälleen ennen päivitystä vietyä varmuuskopiota. Raportti avautui myös offline-uudelleenlatauksella.
- **Tunnettu jatkokorjaus:** tämän jälkeen offline-tilassa avattu tulostusesikatselu jätti Tulosta / PDF -painikkeen pois käytöstä (5 sekunnin odotus). Päivitys ja raportin säilyminen läpäisivät omat tarkistuksensa ennen tätä virhettä. Offline-tulostusta ei merkitä toimivaksi. Verkossa tulostuskäsittelijät läpäisivät aiemmat selaintarkistukset; fyysisen iPhonen AirPrint-valinta on edelleen käyttäjän laitetestissä varmennettava.

Käyttäjän pyynnöstä testaus ja Netlify-buildit pidetään vähäisinä: tässä vaiheessa ei käynnistetty uutta korjausjulkaisua tai laajaa testikierrosta. Seuraavan tulostuskorjauksen kohdennettu hyväksymisehto on offline-esikatselun toimiva painike sekä palaaminen raporttiin.

## Offline-painikkeen korjaus 0.4.0-beta.3

Käyttäjä pyysi myös offline-puutteen korjaamista. Tulostuksen ohjauskoodi tuodaan nyt sovellukseen `?raw`-tuonnilla ja asetetaan esikatselun oman script-elementin tekstiksi. Esikatselu ei lataa erillistä skriptitiedostoa verkosta, ja käsittelijät suoritetaan edelleen esikatselun omassa JavaScript-ympäristössä. Raportin käyttäjätekstejä ei liitetä skriptiin.

- Ennen korjausta yksi kohdennettu offline-testi epäonnistui, koska painike jäi disabled-tilaan.
- Korjauksen jälkeen kaikki 8 tulostusnavigaation mobiili-Chromium/WebKit-tarkistusta läpäistiin (4,6 s): online/offline, tulostuskutsu, paluu, sulkemisen estävä ympäristö ja avaavan sivun pysäyttäminen/korvaaminen.
- TypeScript, muutettujen tiedostojen ESLint, versiohistorian muodostus ja tuotantokooste läpäistiin.
- Käyttäjän pyytämän vähäisen testauksen ja build-kustannusten vuoksi tähän rajattuun jatkokorjaukseen tehdään poikkeus yleisestä CI-menettelystä: laaja CI-uusinta-ajo ja Netlify-esikatselu ohitetaan, paikallinen kohdennettu näyttö kirjataan PR:ään ja julkaistaan yksi beta-build. Sovelluksen muuta toimintaa ei muutettu eikä testien hyväksymisrajoja väljennetty.
- Fyysisen iPhonen AirPrint-valinta on edelleen laitteella varmennettava.

Beta.3 julkaistiin PR:llä 23, commit `5b886b0` (sama Git-puu kuin paikallisesti testatussa `5c1f859`-ehdokkaassa). Julkisessa https://beta.phasekit.app-osoitteessa varmennettiin näkyvä versio sekä mobiili-Chromiumilla offline-uudelleenlataus, offline-tulostuspainikkeen aktivoituminen, tulostuskutsu ja paluu ehjään raporttiin. Ensimmäinen live-WebKit-koe katkesi selaimen sisäiseen virheeseen offline-uudelleenlatauksessa ennen tulostusta; sitä ei lasketa läpäistyksi. WebKitin neljä kohdennettua paikallista tulostustapausta läpäisivät. Esikatselubuildia ei tehty; mergen automaattinen laaja CI-ajo 37008090934 keskeytettiin sovitun rajauksen mukaisesti. Vakaan main-haaran koodia ei muutettu.

## Ainetietojen viimeistely 0.4.0-beta.4

- Seoksen kemiallinen nimi on lyhyesti Kylmäaineseos. Puuttuvien arvojen teksti on Tieto puuttuu (englanniksi Data unavailable); taustan tilat ja Ei sovellu / Ei liukumaa -erottelu säilyvät.
- Lähde- ja lisätietohaitarien chevron peri 8 px ylimääräisen marginaalin. Sen poisto linjaa sisällön otsikon tekstin kanssa.
- Öljyohjeen painike avasi sisällön, mutta puuttuva asemointikonteksti sijoitti sen ruudun ulkopuolelle: ennen korjausta tooltipin y oli −1686 px, otsikon y 526 px. Öljyotsikko toimii nyt ankkurina. Tooltipin y on 576 px, otsikon alareuna 570 px.
- Infoikonit on tuotu 9 px lähemmäs tekstiä yhteisessä tyylissä. 44 × 44 px napautusalue säilyy.
- TypeScript, muutettujen tiedostojen ESLint, versiohistorian muodostus ja tuotantokooste läpäistiin. Yksi mobiili-WebKit-katselmointi varmisti napautuksen, sulkemisen, tooltipin näkyvyyden, haitarien otsikko/sisältölinjaukset ja tekstit; kuvat tarkastettiin. Nykyisen ainetietotestin odotukset päivitettiin.
- Käyttäjän vähäisen testauksen ja build-kustannusten rajauksen mukaisesti tämä pieni esitystapakorjaus käyttää beta.3:n kohdennettua julkaisumenettelyä: ei laajaa CI-uusintakierrosta eikä Netlify-esikatselua, yksi beta-build. Fyysisen iPhonen toiminta jää käyttäjän laitetestiin.

Samaan beta.4-erään lisättiin asetussivun palaute: varmuuskopiointi ja poisto ovat vasemmassa linjassa; kattavuusraportti on alleviivaamaton painiketyylinen linkki; versiohistorialinkissä näkyy vain numero. Anna palautetta -painikkeessa on ulkoisen linkin ikoni sekä erillinen GitHub-selite. Näiden kohdennetut mobiili-WebKit-tarkistukset läpäistiin (linjaus, tyyli, versionumerolinkin navigaatio ja palautepainikkeen yhden rivin koko sekä kohde). Palautetta ei lähetetty. Muutettua nykyistä ainetietotestiä ajettiin vain kerran: mobiili-Chromium, 1 läpäisty / 1,4 s.

Beta-ilmoitus viimeisteltiin samaan erään: versionumero, yhtenäiset Versiohistoria/Vakaa versio -painikkeet ja lyhyt tallennusten erillisyyttä kuvaava lause. Build-revisio näkyy edelleen asetuksissa. Mobiili-WebKitissä painikkeet mahtuivat samalle riville 320/390 px leveydessä; laskurin painike jäi vierityksen jälkeen 40,5 px alavalikon yläpuolelle. Nykyinen kaksikielinen versiohistoriatesti läpäistiin kerran (1 testi / 1,3 s). Alustava paikallinen geometriatarkistus mittasi laskuripainiketta ennen vieritystä ja epäonnistui; tarkistus korjattiin mittaamaan käyttäjän vieritettävissä olevaa näkymää, sovelluksen laskurin asettelua ei muutettu.
