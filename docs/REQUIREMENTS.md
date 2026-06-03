# Product Requirements Checklist

This document keeps the original meeting notes in Croatian and an English working checklist for implementation.

## English Checklist

### Rules and Scoring

- [ ] Award `1` point for an exact score prediction.
- [ ] Award points equal to the selected odds coefficient when the match outcome is predicted correctly.
- [ ] Accumulate points match by match across the competition.
- [ ] Rank users first by total points.
- [ ] Use the World Cup winner tiebreaker as the second ranking criterion.
- [ ] Split prize money as the third step when users are still tied.
- [ ] Support configurable prize distribution ratios, for example `200 / 70 / 30` from the total prize pool.
- [ ] If first place is shared, combine first and second prize amounts and split them between tied users.
- [ ] If the next place is also shared, split the remaining prize amount between those users.

### Odds Entry

- [ ] Enter odds for the first round when the organizers decide.
- [ ] Enter odds for each following round on the last day of the previous round.
- [ ] Use Bet365 as the odds source.
- [ ] Once odds are selected, they cannot be changed.

### Prediction Entry

- [ ] Users must submit predictions before the first match of the round.
- [ ] Each submission window covers all matches in that round.
- [ ] After the deadline expires, all users must be able to see all predictions from other users for that round.
- [ ] Provide a user route where predictions can be viewed by user.
- [ ] Provide a match route where predictions from all users can be viewed by match.

### User

- [ ] Registration must include username.
- [ ] Registration must include first and last name.
- [ ] Registration must include password.
- [ ] Registration must include the user's World Cup winner tiebreaker pick.

### App Entry / Home

- [ ] Show rules initially when entering the app.
- [ ] Allow the user to confirm and dismiss the initial rules view.
- [ ] Keep rules available later on their own route.
- [ ] Show a clear notice at the top when the user needs to enter predictions for the next round.
- [ ] Show the ranking table below the notice.
- [ ] Ranking table columns should include username.
- [ ] Ranking table columns should include total points.
- [ ] Ranking table columns should include the user's tiebreaker.
- [ ] Ranking table columns should include points by round plus playoffs.

## Original Croatian Notes

### Pravila

- Točan rezultat: `1` bod.
- Pogođen ishod: uzimamo kof. Na primjer, ako je kof `1,50`, korisnik dobiva `1,5` bodova.
- Bodovi se iz utakmice u utakmicu zbrajaju.
- Prvo se gleda ukupan broj bodova, drugo se gleda tiebreaker, treće se dijeli iznos.
- Primjer: `1. 200`, `2. 70`, `3. 30`. Gledamo taj omjer na temelju ukupnog fonda.
- Ako se dijeli prvo mjesto, dijele se prvo i drugo mjesto zajedno, dakle `270`, a drugi, odnosno prvi nakon njih, dobiva `30`.
- Ako i to drugo mjesto nakon prva dva dijele dvojica, dobiju po `15` svaki.

### Unos koeficijenata

- Prvo kolo kofove unosimo kada odlučimo.
- Kofove za iduće kolo unosimo zadnji dan prethodnog kola.
- Kofovi se uzimaju sa Bet365.
- Jednom odabrani kof nema promjene.

### Unos predikcije

- Do prve utakmice u kolu, za sve utakmice u tom kolu.
- Kada vrijeme istekne, svi moraju moći vidjeti sve predikcije od drugih za to kolo.
- Predikcije od drugih mogu biti ako imamo route od tog usera da tamo vidimo predikcije po useru.
- Također predikcije možemo imati ako postoji ruta te utakmice gdje vidimo predikcije svih drugih.

### User

- Registracija: username, ime i prezime, password.
- Dodati tiebreaker: pobjednik svjetskog.

### Ulazak u App

- Pravila inicijalno, potvrdi i ugasi. Pravila kasnije imaju svoju rutu.
- Na vrhu će biti naznačeno da treba unijeti rezultate za iduće kolo.
- Ispod se nalazi ranking tablica: username, broj bodova, tiebreaker korisnika, ukupno bodovi po kolima + playoffs.
