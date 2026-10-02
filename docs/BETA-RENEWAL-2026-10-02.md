# Betan korjaukset ja raporttien uudistus

Päiväys: 2026-10-02
Havaintojen lähtöversio: kuvakaappauksissa 0.3.0-beta.9 / b9e6275
Tila: 0.4.0-beta.1-julkaisuehdokas toteutettu ja paikallinen yhdistetty tarkistus läpäisty. Beta-julkaisu ja live-tarkistus seuraavaksi; vakaa erikseen.

## Toteutuslupa ja työskentelyohje

Käyttäjä on antanut GO-komennon tämän kokonaisuuden toteutukseen.
Uutta yleistä toteutuslupaa ei tarvitse pyytää.

- Säilytä tämä tiedosto projektissa ja päivitä eteneminen siihen.
- Tarkista projektin nykyinen tila, AGENTS.md-ohjeet ja käyttäjän
  keskeneräiset muutokset ennen muokkaamista.
- Käytä toteutukseen Luna- ja Sol-ala-agentteja.
- Käyttäjän toive: suunnittelija ja koordinoija käyttää Astra High -mallia.
- Tarkista saatavilla olevat mallit; älä väitä käyttäväsi mallia,
  jota ympäristö ei tarjoa.
- Jaa agenteille erilliset muokkausvastuut.
- Koordinoija vastaa kokonaisuuden suunnittelusta, yhdistämisestä
  ja yhdistetyn toteutuksen tarkistamisesta.
- Julkaise aina ensin betaan. Vakaa julkaisu käsitellään erikseen.
- Säilytä olemassa olevien raporttien tiedot ja varmuuskopioiden
  yhteensopivuus. Kentän poistaminen näkymästä ei saa hävittää vanhaa tietoa.
- Kaikki alla olevat ratkaisut ovat suunnittelun lähtökohtia.
  Säädös- ja aineistokysymykset on tarkistettava ennen toteutuspäätöstä.
- Älä täytä puuttuvia ominaisuus- tai turvallisuustietoja arvauksilla.
- Kirjaa valmistuneeseen kohtaan toteutus, tarkistukset ja mahdolliset
  jäljelle jäävät rajoitteet.
- Jatka uusia havaintoja numerosta 29. Säilytä aiemmat tunnisteet.

Tätä listaa laadittaessa projektin lähdekoodiin ei päästy.
Koodimuutoksia, lähdevarmennuksia, testejä tai julkaisuja ei ole tehty.
Kuvakaappauksissa näkyvät väitteet ja säädösviitteet eivät itsessään
ole varmennettuja lähteitä.

## Tavoitteet

1. Selkeä ja johdonmukainen käyttöliittymä.
2. Oikein esitetyt aineominaisuudet ja puuttuvan tiedon merkitykset.
3. Kentällä helpot, nopeat ja kattavat raportit.
4. Vaatimusten mukaiset asiakirjat ja selkeät tulosteet.
5. Tietojen kirjaaminen kerran ja hyödyntäminen kaikissa tarpeellisissa osissa.

Raportit ovat käyttäjälle todennäköisesti sovelluksen tärkein
kenttäkäytön kokonaisuus. Niihin pitää panostaa erityisesti.

## Työnjako ja toteutusjärjestys

### Koordinoija

- Inventoi raporttityypit, tietomallit, aineistot ja julkaisutapa.
- Määritä yhteiset komponentit, tietojen tilat ja hyväksymiskriteerit.
- Rajaa Lunan ja Solin muokkausvastuut tiedostoittain.
- Ratkaise riippuvuudet ja tarkista yhdistetty lopputulos.
- Ylläpidä tätä työlistaa ja beta-version muutoshistoriaa.

### Luna

- Käyttöliittymä, tekstit, linkit, tilatunnisteet ja haitarit.
- Asetusten selkeytys.
- Raporttilomakkeiden mobiilikäyttö, osiointi ja tulostus.
- Käyttää Solin varmentamia sisältö- ja laskentasääntöjä.

### Sol

- Aineistojen kattavuus ja luokitukset.
- Raporttien kenttä- ja työvaiheinventaario.
- Säädösperusteet, laskentalogiikka ja ehdolliset vaatimukset.
- Raporttitietojen yhteensopivuus ja asiakirjojen muodostaminen.

### Eteneminen

1. Inventaario ja nykyisen toiminnan tarkistus.
2. Yhteiset tietomalli- ja sisältöpäätökset.
3. Riippumattomat käyttöliittymäkorjaukset rinnakkain sisältöselvityksen kanssa.
4. Raporttien automaatio, lomakkeet ja tulosteet.
5. Yhdistetyn toteutuksen tarkistus.
6. Beta-julkaisu ja muutoshistoria.

## Yhteinen tietojen esitysperiaate

Erota toisistaan:

- tunnettu arvo;
- aineistosta puuttuva tieto;
- ominaisuus, joka ei sovellu;
- luokitus, jota ei löytynyt tarkistetusta lähteestä;
- lähteen vahvistama ominaisuuden puuttuminen.

Tuntematon ei tarkoita nollaa, palamatonta, vapautettua tai hyväksyttyä.
Arvon olosuhteet, lähde ja soveltuvuus pitää voida selvittää.

---

## BETA-01 — Lämpötilaliukuman sanamuoto

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Yhteinen ominaisuustilan tulkinta näyttää varmennetun nollaliukuman ja tunnistetun yksikomponenttisen aineen kohdalla “Ei liukumaa”. Päätelmä ja olosuhteet ovat selitteessä. Tuntematon seos ei muutu nollaksi.

Havainto:
Lämpötilaliukuman kohdalla näkyy "Ei sovellu".
Käyttäjän ehdotus on "Ei liukumaa".

Ratkaisu:
Näytä "Ei liukumaa", kun liukuman puuttuminen on tiedossa.
Tarkista erikseen hyvin pienten liukumien esitystapa.

Hyväksyminen:
- Puuttuvaa arvoa ei tulkita nollaksi.
- Numeerisen arvon ja tekstin käyttö on johdonmukaista.
- Mahdollinen paine- tai olosuhderiippuvuus huomioidaan.

## BETA-02 — Tiheystietojen kattavuus

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Tiheyden esitys edellyttää yksikköä, olomuotoa, lämpötilaa, absoluuttista painetta ja menetelmää. Puutteellinen olosuhderivi ei esitä lukua varmennettuna. Uusia tiheysarvoja ei lisätty ilman varmennettua mallia; aineistovaje säilyy näkyvänä.

Havainto:
Monella aineella tiheyden kohdalla lukee "Tieto puuttuu".
Tieto ei ole käyttäjälle keskeinen, mutta tyhjien kenttien määrä häiritsee.

Ratkaisu:
Selvitä saatavilla olevat lähteet ja soveltuvat aineominaisuusmallit.
Pelkkä kemiallinen nimi ei riitä luotettavan tiheyden laskemiseen:
tarvitaan aineen tunnistus, olomuoto, lämpötila ja paine.

Hyväksyminen:
- Tiheydellä on yksikkö ja määritellyt olosuhteet.
- Mallista laskettu tieto erottuu tarvittaessa lähteen taulukkoarvosta.
- Turhia puuttuvan tiedon rivejä voidaan vähentää johdonmukaisesti
  peittämättä aineiston todellisia rajoitteita.

## BETA-03 — PED-ryhmän merkitys ja puuttuvat arvot

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: PED esitetään fluidiryhmänä 1/2 ja erotetaan turvallisuusluokasta. Artikla 13 ja jäljelle jäävä aineistovaje on kirjattu lähdeselvitykseen.

Havainto:
PED on käyttäjälle epäselvä ja puuttuu lähes kaikilta aineilta.

Ratkaisu:
Tarkista kentän merkitys toteutuksesta.
PED tarkoittaa painelaitedirektiiviä; kentän oletetaan tarkoittavan
fluidiryhmää 1 tai 2. Lisää ymmärrettävä selite ja selvitä kattavuus.

Hyväksyminen:
- Käyttäjä ymmärtää, mitä luokitus tarkoittaa.
- PED-ryhmää ei sekoiteta kylmäaineen turvallisuusryhmään.
- Arvot perustuvat soveltuvaan luokitukseen ja lähteisiin.
- Puuttumisen syy kuvataan mahdollisuuksien mukaan täsmällisesti.

## BETA-04 — Syttymistietojen puuttuminen ja soveltuvuus

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Puuttuva tieto ja soveltumaton ominaisuus on erotettu. “Ei syty” -yleistystä ei tehdä yksittäisen ominaisuuden tilasta.

Havainto:
Alempi syttymisraja ja itsesyttymislämpötila näkyvät puuttuvina myös
aineilla, joille käyttäjä odottaa palamattomuutta kuvaavaa merkintää.

Ratkaisu:
Tarkista kentät ja lähteet erikseen.
Erota puuttuva tieto, soveltumaton ominaisuus ja lähteen vahvistama
testiolosuhteisiin sidottu palamiskäyttäytyminen.

Hyväksyminen:
- Yleinen "Ei syty" ei korvaa tietoa ilman perustetta.
- Alemmalle syttymisrajalle ja itsesyttymislämpötilalle käytetään
  niiden merkitykseen sopivia tiloja.
- Lyhyt näkyvä teksti ja tarvittava tarkennus ovat ymmärrettäviä.

## BETA-05 — Öljytyyppien nimet ja typografia

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Öljyn lyhenne ja pitkä nimi esitetään samalla typografialla, ilman hover-riippuvuutta.

Havainto:
Öljyn lyhenne ja pitkä nimi eivät erotu selkeästi.
Fontti vaikuttaa poikkeavalta.

Ratkaisu:
Yhtenäistä typografia.
Ensisijainen esitys esimerkiksi "POE (polyoliesteri)" ja
"PVE (polyvinyylieetteri)".
Vaihtoehtoinen selite toimii myös kosketuksella ja näppäimistöllä.

Hyväksyminen:
- Yleisesti käytetty lyhenne on helposti löydettävissä.
- Pitkä nimi on saatavilla ilman pelkkää hiiren hover-toimintoa.
- Tyypilliset ja muut mahdolliset öljyt esitetään yhtenäisesti.

## BETA-06 — Rajoitusten tilat ja päivämäärät

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Rajoitukset ja raportit käyttävät yhteistä tekstillistä status-badge-perustaa; päivämäärä on erillään.

Havainto:
"Tulossa · 1.1.2032" ja rajoituksen nimi eivät erotu riittävästi.
Raporttilistan tunnisteita voisi hyödyntää ja parantaa samalla.

Ratkaisu:
Yhteinen tilatunnisteiden tyyli: esimerkiksi "Tulossa" ja "Voimassa".
Päivämäärä erikseen. Arvioi hillitty värikoodaus.

Hyväksyminen:
- Tila näkyy tekstinä eikä pelkästään värinä.
- Värit ja kontrastit ovat saavutettavia.
- Tilojen päivämäärärajat ovat oikein.
- Raporttien ja rajoitusten tunnisteilla on yhteinen visuaalinen perusta.

## BETA-07 — Versiohistoria ja betailmoitus

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Asetusten versionumero ja betailmoituksen Uutta-linkki johtavat versiohistoriaan. Vakaan linkki ja paikallisen tallennuksen tieto säilyvät.

Havainto:
Asetuksissa on versionumero ja erillinen "Versiohistoria ja uutta" -linkki.
Betailmoituksesta halutaan pääsy versiohistoriaan ja uusiin ominaisuuksiin.

Ratkaisu:
Tee asetusten versionumerosta alleviivattu versiohistorialinkki.
Lisää betailmoitukseen kompakti versionumerolinkki tai "Uutta"-linkki.

Hyväksyminen:
- Betailmoituksen koko ei kasva merkittävästi.
- Nykyisen version muutokset löytyvät helposti.
- Vakaan version linkki ja tallennusten paikallisuutta koskeva tieto säilyvät.

## BETA-08 — Palautelinkin selkeys

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Palautelinkki on alleviivattu ja kertoo GitHub Issues -kohteen.

Havainto:
"Anna palautetta tai ilmoita virheestä" ei näytä selvästi linkiltä.

Ratkaisu:
Selkeä linkkityyli ja kohteen täsmennys, esimerkiksi:
"Anna palautetta tai ilmoita virheestä (GitHub Issues)".

Hyväksyminen:
- Linkki erottuu tavallisesta tekstistä.
- Kohde vastaa tekstiä.
- Näppäimistökohdistus näkyy.

## BETA-09 — Asetusten varmuuskopiointi- ja poistotoiminnot

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Varmuuskopion vienti ja tuonti jakavat rivin tilan salliessa ja rivittyvät pienellä näytöllä. Poisto pysyy erillisenä varmistettuna toimintona.

Havainto:
Vie ja tuo varmuuskopio vievät paljon pystysuuntaista tilaa.
Käyttäjä ehdottaa samaa riviä, mahdollisesti myös poistolle.

Ratkaisu:
Vie ja tuo samalle riville tilan salliessa.
Arvioi poiston paikka samassa ryhmässä selkeästi erottuvana toimintona.

Hyväksyminen:
- Pienellä näytöllä toiminnot rivittyvät ilman ylivuotoa.
- Poistoa ei helposti sekoita varmuuskopiointiin.
- Nykyinen poistovarmistus säilyy.
- Vienti ja tuonti toimivat muutoksen jälkeen.

## BETA-10 — SHA-256 ja kattavuusraportin linkki

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Kattavuusraportti on selkeä alleviivattu navigointilinkki; ulkoisen välilehden merkintä vastaa toimintaa. SHA-256 säilyy tarkistussummana.

Havainto:
Erityisesti kattavuusraportti ei näytä navigointilinkiltä.
SHA-merkintä on käyttäjän mukaan pääosin hyväksyttävä.

Ratkaisu:
Tarvittaessa selite "Tarkistussumma (SHA-256)".
Raportille alleviivattu linkki, esimerkiksi "Avaa kattavuusraportti →".

Hyväksyminen:
- Haitarin avaaminen ja sivulle siirtyminen erottuvat toisistaan.
- Uuden välilehden merkintää käytetään vain, jos toiminta vastaa sitä.

## BETA-11 — Puuttuvan EU-GWP-arvon teksti

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Lyhyt “EU-GWP puuttuu aineistosta” ei korvaa säädösarvoa toisella arvolla.

Havainto:
"EU-säädöksen GWP-arvoa ei ole tässä tietoaineistossa."
on pitkä ja kömpelö.

Ratkaisu:
Ehdotus: "EU-GWP puuttuu aineistosta".
Pidä tarvittava tarkennus taustatiedoissa.

Hyväksyminen:
- Teksti on lyhyempi ja ymmärrettävä.
- Se ei väitä, ettei arvoa olisi olemassa muualla.
- Säädösarvoa ei korvata huomaamatta toisen lähteen eri GWP-arvolla.

## BETA-12 — Puuttuvat turvallisuus- ja aineryhmät

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: R1243zf:n HFO-aineryhmä korjattu US EPA:n lähteellä. Turvallisuusluokka jää puuttuvaksi: ristiriitaisista A2/A2L-tiedoista ei valittu arvausta.

Havainto:
Kuvassa R1243zf:n turvallisuusryhmä on "Tieto puuttuu"
ja aineryhmä "Luokittelematon".

Ratkaisu:
Selvitä aineistokattavuus, tunnisteiden yhdistäminen ja käytetyt lähteet.
Tarkista molemmat luokitukset erikseen.

Hyväksyminen:
- Luokitusta ei päätellä pelkästä kemiallisesta nimestä.
- Aineistosta puuttuminen ei näytä vahvistetulta luokittelemattomuudelta.
- Varmennetut korjaukset kirjataan lähteineen.

## BETA-13 — Raporttien päällekkäinen navigointi

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Työmaaraportit poistettu Työkalut-luettelosta; Raportit säilyy pääosiona.

Havainto:
Työmaaraportit löytyvät sekä Työkalut-listasta että alanavigaatiosta.

Ratkaisu:
Poista Työmaaraportit työkalulistasta.
Arvioi myös Työkalut-sivun Raportit-osioon ohjaavan tekstin tarpeellisuus.

Hyväksyminen:
- Raportit löytyvät edelleen pääosionsa kautta.
- Muut työkalulinkit säilyvät toimivina.

## BETA-14 — Raporttien oma palautekokonaisuus

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Kaikki viisi raporttipohjaa inventoitu; yhteenveto docs/BETA-REPORT-FIELD-INVENTORY.md, toteutus BETA-19–28.

Alkuperäinen havainto:
Käyttäjä ilmoitti listaavansa raporttipalautteen erikseen.

Jatko:
Palaute on vastaanotettu ja kirjattu kohtiin BETA-19–BETA-28.
Tällä kohdalla ei ole itsenäistä koodimuutosta.
Sulje, kun raporttikokonaisuuden kattavuus on tarkistettu.

## BETA-15 — Sääntömoottorin PoC-huomautus

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: PoC-teksti korvattu täsmällisellä laskennan rajauksella ja laskentaperusteet avaavalla toiminnolla.

Havainto:
"Sääntömoottorin PoC. Asiantuntijan hyväksyntä ennen tuotantokäyttöä."
on käyttäjän mielestä huono ja kömpelö.

Ratkaisu:
Tarkista, vastaako teksti nykyistä toteutusta.
Ehdotus: "Lähteet ja laskentaperusteet" -linkki sekä vain tarpeellinen,
täsmällinen käyttörajoitus.
Älä korvaa tekstiä toisella pitkällä yleisvaroituksella.

Hyväksyminen:
- Teksti kuvaa todellista tilaa.
- Oikeaa lähtödataa ei pidetä yksin laskentalogiikan validointina.
- Lähteet ja olennaiset soveltamisrajat löytyvät helposti.

## BETA-16 — Paine–lämpötilakenttien yläviivat

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: P–T-kenttien yläviivat poistettu. Syötetty/laskettu-merkinnät ja jatkuva laskenta säilyvät.

Havainto:
Kenttien yläviivat muistuttavat tab-navigaatiota.

Ratkaisu:
Poista viivat.
Arvioi ohjetekstin koon kasvattaminen tavallisen leipätekstin tasolle:
"Muuta painetta tai lämpötilaa — toinen arvo päivittyy heti."

Hyväksyminen:
- Kenttiä ei sekoita välilehtiin.
- Syötetty ja laskettu arvo erottuvat edelleen.
- Laskenta, yksikönvaihto ja näppäimistökäyttö toimivat.

## BETA-17 — Haitarien välityksen tiivistäminen

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Yhteinen haitarivälitys tiivistetty; kosketusalueet säilyvät.

Havainto:
Peräkkäisten haitarien välissä on liikaa tyhjää tilaa.

Ratkaisu:
Tiivistä yhteistä välistystä johdonmukaisesti.

Hyväksyminen:
- Tarkista avoimet, suljetut ja peräkkäiset haitarit.
- Kosketusalueet ja tekstin luettavuus säilyvät riittävinä.
- Muutos ei aiheuta ahtautta muissa näkymissä.

## BETA-18 — Sisäkkäiset Tietojen tausta -haitarit

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: P–T-, tulistus/alijäähdytys- ja vuototarkastustaustoissa on yksi ulompi haitari, lähteet sen tavallisena sisältönä.

Havainto:
"Tietojen tausta ja käyttöalue" sisältää uuden "Tietojen tausta" -haitarin.

Ratkaisu:
Yksi ulompi haitari, jonka sisällä ovat tavalliset alaotsikot:
esimerkiksi "Laskentamalli", "Käyttöalue" ja "Lähteet".

Hyväksyminen:
- Samanniminen sisäkkäinen haitari poistuu.
- Lähteet, tarkistuspäivät, versiot ja käyttöalue säilyvät saatavilla.
- Rakennetta käytetään johdonmukaisesti vastaavissa näkymissä.

---

## BETA-19 / R1 — Valmistajan ohje / versio -kentät

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Yleinen ohje/versio-kenttä näkyy vain vanhassa raportissa, jos siihen on tallennettu tietoa. Koekohtaiset rajat ja niiden ohjeviite säilyvät mittausten yhteydessä.

Havainto:
Kenttiä on monessa raportissa. Ne hämäävät ja tuntuvat turhilta.
Käyttäjä haluaa ne pois, jos ne eivät ole pakollisia.

Ratkaisu:
Tarkista raporttikohtainen tarve ja mahdollinen vaatimus.
Poista tarpeettomat kentät; näytä ehdolliset kentät vain tarvittaessa.
Ohjeen noudattaminen ja ohjeversion kirjaaminen ovat eri asioita.

Hyväksyminen:
- Säilytetyn kentän tarkoitus on perusteltu.
- Pakollisuutta ei oleteta nykyisestä lomakkeesta.
- Vanhojen raporttien tieto ei katoa.

## BETA-20 / R2 — Tyhjiöinnin mittaukset ja kestot

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Tyhjiöinnin kesto on vanhojen tietojen kenttä; pitokokeen kesto säilyy. Pumpun käydessä saavutettu paine on erillinen valinnainen mittaus. 2,7 mbar ei ole yleinen oletus.

Havainto:
Käyttäjän työssä tavoitepaine on aina alle 2,7 mbar.
Saavutettu paine ja pitokokeen alkupaine tuntuvat päällekkäisiltä.
Pitokokeen kesto mitataan aina, tyhjiöinnin kestoa harvoin.

Ratkaisu:
- Tarkista alle 2,7 mbar -tavoitteen soveltuvuus oletukseksi.
- Ehdotus: poista tyhjiöinnin kestokenttä.
- Säilytä pitokokeen kesto.
- Selvitä, tarvitaanko saavutetun paineen erillinen kirjaus.
- Sovella korjaus kaikkiin raportteihin, joissa tyhjiöinti esiintyy.

Huomio:
Nykyisen ohjetekstin mukaan saavutettu paine mitataan pumpun käydessä
ja pitokokeen alkupaine pumpusta erotetussa järjestelmässä.
Niitä ei saa automaattisesti olettaa samaksi mittaukseksi.

Hyväksyminen:
- Mittaushetket ja paineen yksikkö ovat selkeät.
- Tavoite perustuu soveltuvaan ohjeeseen.
- Todellisia mittaustuloksia ei täytetä oletuksilla.
- Hyväksyntää ei päätellä puuttuvista tiedoista.

## BETA-21 / R3 — Mittari-kentän nimeäminen

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Mittarin merkki ja malli -nimeäminen käytössä tyhjiöintikirjauksissa.

Havainto:
"Mittari" ei kerro, halutaanko mittarin malli vai jokin muu tieto.

Ratkaisu:
Esimerkiksi "Mittarin merkki ja malli".
Laitetunniste vain, jos sitä tarvitaan jäljitettävyyteen.

Hyväksyminen:
- Kentän tarkoitus on selvä ilman erillistä ohjetta.
- Nimeäminen on yhtenäinen eri raporteissa.

## BETA-22 / R4 — Mittauspaikka-kentän tarve

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Mittarin liitäntäkohta täsmentää mittauspaikan merkityksen; kenttä on tulkintaa tukeva, ei työmaan osoite.

Havainto:
Käyttäjä ei tiedä, mitä kenttään pitäisi vastata tai tarvitaanko sitä.

Ratkaisu:
Tarkista kentän alkuperäinen tarkoitus.
Jos tarkoitetaan liitäntäkohtaa, käytä nimeä "Mittarin liitäntäkohta"
ja tarvittaessa lyhyttä esimerkkiä.
Poista kenttä, jos se ei ole tarpeellinen.

Hyväksyminen:
- Kenttää ei sekoita työmaan osoitteeseen tai laitteen sijaintiin.
- Säilyttämiselle on raportin tulkintaan tai vaatimukseen liittyvä peruste.

## BETA-23 / R5 — Ohjeen tyhjiötavoite ja pitokokeen rajat

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Tavoitepaine ja pitokokeen hyväksymisraja kirjataan mittausten yhteydessä. Vanha yhdistelmäkenttä säilyy vain olemassa olevan tiedon kanssa.

Havainto:
Erillinen vapaa tekstikenttä tuntuu turhalta.

Ratkaisu:
Poista päällekkäinen kenttä.
Näytä tarvittavat tavoite- ja hyväksymisrajat mittausten yhteydessä.
Käsittele laitekohtainen poikkeus tarvittaessa samassa yhteydessä.

Hyväksyminen:
- Käyttäjä ei kirjoita samaa tavoitetta kahdesti.
- Rajojen lähde ja soveltuvuus ovat selvitettävissä.
- Rakenteiset rajat ja vapaa teksti eivät ole ristiriidassa.

## BETA-24 / R6 — Havainnot ja muistiinpanot

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Havainnot ja muistiinpanot jakavat nelirivisen, kasvatettavan kirjoitusalueen. Yhteisrajan ylittävät vanhat tekstiparit säilytetään erillään; tulosteessa molemmat kokonaan.

Havainto:
"Havainnot ja arvio" on liian matala ja päällekkäinen muistiinpanojen kanssa.

Ratkaisu:
Yhdistä lähtökohtaisesti kentäksi "Havainnot ja muistiinpanot".
Vähintään kolme näkyvää riviä.
Kenttä kasvaa sisällön mukaan tai on suurennettava.
Mahdollinen työvaiheen hyväksyntätulos säilyy omana selkeänä tietonaan.

Hyväksyminen:
- Pitkä teksti on helppo kirjoittaa mobiilissa.
- Teksti tulostuu kokonaan.
- Vanhojen molempien kenttien sisältö säilyy ilman ylikirjoitusta.

## BETA-25 / R7 — Kaikkien raporttien työvaiheiden tarkistus

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Kaikkien viiden pohjan työvaiheet ja kentät inventoitu. Tiiviyskoe nimetty erilleen painelujuuskokeesta. Rastien merkitys on kirjattu työvaihe, ei hyväksytty mittaustulos.

Havainto:
Käyttäjä pyytää tarkistamaan kaikkien raporttien työvaiheiden
järkevyyden, tarpeellisuuden ja oikeellisuuden.

Ratkaisu:
Inventoi jokaisen raporttityypin työvaiheet.
Arvioi järjestys, päällekkäisyydet, soveltuvuus ja pakollisuus.
Piilota tilanteeseen kuulumattomat vaiheet ehdollisesti tai mahdollista
perusteltu "Ei sovellu" silloin, kun se on oikein.

Hyväksyminen:
- Kaikki nykyiset raporttityypit on käsitelty.
- Tarkistuksesta jää raporttityyppikohtainen yhteenveto.
- Vaiheen suorittamista tai hyväksyntää ei oleteta automaattisesti.
- Pienkylmän tavallinen työnkulku on selkeä.

## BETA-26 / R8 — Kaikki raporttikentät ja automaattiset päätelmät

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Raportti käyttää olemassa olevaa EU/FI-vuototarkastusmoottoria. Sääntö-, aineisto-, päiväys- ja lähtötietoevidenssi tallentuu; muutetut lähtötiedot mitätöivät vanhan arvion. Painekoetarve kirjataan ohjatulla dokumentti-/asiantuntijaperusteella, eikä sitä päätellä kylmäaineesta.

Havainto:
Raporttien kaikki kentät pitää tarkistaa.
Erityisesti vuototarkastusvälin voisi laskea ja painekoekysymys on vaikea.

Ratkaisu:
Luokittele jokainen kenttä:
tarpeellinen / ehdollinen / automaattinen / poistettava.

Vuototarkastusväli:
- Hyödynnä kylmäainetta ja täyttömäärää.
- Kysy vain soveltuvan säännön vaatimat lisätiedot.
- Mahdollisia lisätietoja ovat laitteiston tyyppi, hermeettisyys
  ja vuodonilmaisujärjestelmä.
- Näytä päätelmä ja ymmärrettävä peruste.
- Päivitä tulos, jos lähtötiedot muuttuvat.

Painekoe:
- Selitä painekokeen ja tiiviyskokeen ero.
- Selvitä soveltuva vaatimus ja tarvittavat lähtötiedot.
- Älä johda koetarvetta tai koepainetta pelkästä kylmäaineesta
  ja täyttömäärästä.
- Korvaa vaikea avoin perustelupyyntö ohjatulla menettelyllä,
  jos luotettava päätöslogiikka on toteutettavissa.

Hyväksyminen:
- Puuttuvat lähtötiedot johtavat täydennyspyyntöön, eivät vapautukseen.
- Laskennan säädösversio ja peruste ovat jäljitettävissä.
- Olennaiset raja-arvot ja poikkeukset on testattu.
- Tarkistusta vaativa tilanne erottuu ratkaistusta tilanteesta.

## BETA-27 / R9 — Asennustodistus, käyttöönotto ja liitteet

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Asennustodistus ja tekninen käyttöönotto ovat eri tarkoituksia. Asennustodistuksen tiedot, kolme sisäistä koepöytäkirjaa ja ulkoiset viitteet muodostavat selkeän kokonaisuuden. Käyttöpaikka ja laitetunniste erillään. Puuttuvan kohdan linkki avaa ja kohdistaa kenttään. Lukitseminen ei ole allekirjoitus tai tekninen hyväksyntä.

Havainto:
Käyttäjän käsityksen mukaan asiakkaalle tarvitaan käyttöönottopöytäkirja
ja asennustodistus.
Ei ole selvää, tuottaako sovellus molemmat vai ovatko ne sama dokumentti.

Kuvassa on osio:
"Asennustodistuksen tiedot · VNa 1063/2025 § 9 · 13 täydennettävää".

Kuvan teksti kertoo raportin tukevan asennustodistuksen valmistelua,
liitteiden toimittamisesta erikseen ja vastuuhenkilön allekirjoituksesta.
Tämän toteutuksen kattavuutta tai säädöstulkintaa ei ole varmennettu.

Ratkaisu:
- Tarkista ajantasaisista lähteistä käyttötapauksen asiakirjavaatimukset.
- Selvitä nykyinen raportti-, tuloste- ja liitetoteutus.
- Ratkaise, tarvitaanko erilliset dokumentit vai yhteinen kokonaisuus.
- Syötä yhteiset tiedot vain kerran.
- Käytä raportin omia tiiviyskoe-, tyhjiöinti- ja koekäyttötietoja
  automaattisissa sisäisissä viitteissä tai muodostetuissa liitteissä.
- Näytä ulkoisen viitteen tai liitteen kenttä vain tarvittaessa.
- Jaa pitkä lomake ymmärrettäviin osiin.
- Lisää osiokohtainen valmistumisen ja puuttuvien tietojen ilmaisin.
- Puuttuvaa kohtaa painamalla pääsee täydentämään sitä.

Hyväksyminen:
- Asiakkaalle muodostuva asiakirjakokonaisuus on yksiselitteinen.
- Viitteet osoittavat todellisiin osiin tai mukana oleviin liitteisiin.
- Pelkkää viitetekstiä ei esitetä toimitettuna liitteenä.
- Sama mittaus ei vaadi toistuvaa käsinsyöttöä.
- Valmistumisilmaisin huomioi ehdolliset kentät.
- Täyttöaste ei tarkoita teknistä hyväksyntää tai allekirjoitusta.
- Lukitseminen, hyväksyntä ja allekirjoitus erotetaan toisistaan.

## BETA-28 / R10 — Raporttien kenttäkäyttö ja tulostus

- [x] Toteutettu ja yhdistetty tarkistus läpäisty; tietorajoitteet kirjattu lähdemuistioon

Toteutus 0.4.0-beta.1: Osioitu lomake, ehdolliset kentät, automaattitallennus ja uusi tulostusrakenne. Vanhan beta.9:n kymmenen luonnos/lukittu-testiraporttia säilyivät avaamisen ja tulostamisen jälkeen JSON-viennissä täsmälleen. Yhdistetty Chromium/WebKit-tarkistus työpöytä- ja puhelinkoossa sekä todelliset 3- ja 4-sivuiset PDF:t tarkistettu. Fyysinen iPhone-tarkistus jää käyttäjän testaukseen.

Havainto:
Raportit ovat käyttäjälle sovelluksen tärkein käytännön työkalu.
Niiden pitää olla helpot, selkeät, nopeat, kattavat ja viralliset
sekä tyylikkäät ja selkeät tulostettuna.

Ratkaisu:
- Optimoi tavallinen työnkulku puhelimella tehtäväksi.
- Vähennä käsinkirjoitusta ja hyödynnä jo annettuja tietoja.
- Ryhmittele tiedot työn todellisen etenemisen mukaan.
- Näytä vain tilanteeseen kuuluvat lisäkentät.
- Suunnittele tulostus erikseen lomakenäkymästä.
- Varmista pitkien tekstien, taulukoiden, liitteiden ja
  allekirjoitusalueiden toimivuus sivunvaihdoissa.

Hyväksyminen:
- Tavallinen pienkylmän raportti voidaan täyttää alusta loppuun mobiilissa.
- Keskeneräisen raportin tallennus ja jatkaminen toimivat.
- Nykyinen offline-toiminta säilyy.
- Validointivirheet ohjaavat oikeaan kenttään ja kertovat korjauksen.
- Tulosteessa ei näy käyttöliittymän nappeja tai tarpeettomia tyhjiä osia.
- Pitkät sisällöt eivät leikkaudu.
- Asiakirjan tunnistetiedot ja tarvittavat hyväksyntä- tai
  allekirjoituspaikat löytyvät.
- Asiakirjan vaatimustenmukaisuus perustuu tarkistettuun sisältöön,
  ei pelkkään ulkoasuun tai "virallinen"-nimitykseen.

---

## Yhteinen tarkistus ennen beta-julkaisua

- [x] Kaikki kohdat on toteutettu tai jäljelle jäänyt este kirjattu.
- [x] Projektin vaatimat tyyppi-, lint-, testi- ja build-tarkistukset ajettu.
- [x] Muuttuneiden laskentasääntöjen rajatapaukset tarkistettu.
- [x] Yhdistetty toteutus tarkistettu agenttien työn yhdistämisen jälkeen.
- [x] Keskeiset näkymät tarkistettu puhelimen ja työpöydän koossa.
- [x] Linkit, näppäimistökäyttö, kohdistus ja kosketuskäyttö tarkistettu.
- [x] Vanhan raportin avaaminen, muokkaus, tallennus ja tulostus tarkistettu.
- [x] Vanhojen poistuvien tai yhdistyvien kenttien tiedot säilyvät.
- [x] Varmuuskopion vienti ja tuonti tarkistettu muutosten osalta.
- [x] Raporttien todelliset tulosteet/PDF:t tarkistettu myös monisivuisina.
- [x] Lähteet ja säädöstulkintojen tarkistuspäivät kirjattu.
- [x] Versiohistoria päivitetty käyttäjälle ymmärrettävästi.
- [ ] Julkaistu ensin betaan ja julkaistu versio kirjattu tähän.
- [x] Vakaa versio jätetty odottamaan erillistä julkaisupäätöstä.

## Toteutusmerkinnän malli

Lisää valmistuvaan kohtaan:

- Tila:
- Toteutettu ratkaisu:
- Muutetut tiedostot:
- Lähteet ja tarkistuspäivä, jos tarpeen:
- Tarkistukset ja tulokset:
- Jäljelle jäävät puutteet:
- Beta-versio:

## Toteutuksen vastuut ja tarkistusnäyttö

- Astra High aloitti koordinoinnin; sen käyttörajan jälkeen juuriagentti jatkaa yhdistämistä ja julkaisua.
- Luna: käyttöliittymä, linkit, tilat, haitarit ja niihin liittyvät selaintestit.
- Sol: kenttä- ja työvaiheinventaario, lähdeselvitys, ehdollinen logiikka, aineiston täsmennys ja yksikkötestit.
- Juuriagentti: raporttieditori, tulosteet, vanhojen tietojen selainregressiot, yhdistetty QA ja beta-julkaisu.
- Lähteet ja jäljelle jäävät tietorajoitteet: [BETA-RENEWAL-SOURCES.md](BETA-RENEWAL-SOURCES.md), tarkistettu 2.10.2026.
- Kenttäkohtainen inventaario: [BETA-REPORT-FIELD-INVENTORY.md](BETA-REPORT-FIELD-INVENTORY.md).
- Yksikkötestit: **436/436** läpäisty 2.10.2026.
- Lopullinen yhdistetty Playwright-kierros: **426 läpäisty, 2 ohitettu**, Chromium ja WebKit työpöytä- ja puhelinkoossa. Ohitukset ovat tunnetut WebKitin offline-uudelleenlatauksen testiympäristörajoitteet; Chromiumin offline-testit läpäisty.
- TypeScript, ESLint, aineistovalidointi (249 ainetta, 58 lähdettä), tokenit, versiohistoria, tuotantobuild ja diff-tarkistus läpäisty.
- Testattu vanhan beta.9:n kymmenen synteettistä raporttia (viisi pohjaa, luonnos ja lukittu): tuonti, avaaminen, tulostus ja vienti säilyttävät alkuperäiset raporttiobjektit täsmälleen.
- Pitkä vanha havainto ja muistiinpano säilyvät muokkauksen ja viennin jälkeen; molempien loppumerkit löytyvät nelisivuisen PDF:n tekstistä. Kolmisivuinen sisäisten pöytäkirjojen asennustodistus tarkistettu kuvina.
- Jäljelle jäävät rajat: puuttuvia ominaisuusarvoja ei arvata; R1243zf:n turvallisuusluokka on edelleen avoin lähderistiriidan vuoksi. Fyysistä iPhonea ei ole testattu tällä kierroksella.
- Beta-julkaisun ja live-tarkistuksen tila päivitetään julkaisun jälkeen.
