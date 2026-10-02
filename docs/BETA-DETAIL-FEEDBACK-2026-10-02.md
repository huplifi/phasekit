# Ainetietojen ja tulostuksen jatkokorjaukset 2.10.2026

Tila: toteutettu ja tarkistettu paikallisesti. Käyttäjä hyväksyi 0.4.0-beta.2-testijulkaisun 2.10.2026; julkaisu varmennetaan PR:n ja julkisen beta-osoitteen kautta.

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
