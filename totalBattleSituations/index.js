const {FormatsData} = require('./formats-data.js');
const {Pokedex} = require('./pokedex.js');
const {Learnsets} = require('./learnsets.js');
const {Items} = require('./items.js');

const HAPPINESS_MAX = 255n;
const LEVELS_MAX = 100n;
const MOVE_COUNT_MAX = 4;
const NATURES = 21n; // 5 of the 25 natures are the same

const EV_MAX = 127; // Since 4 EVs equals one stat point, there are effectively Math.floor(255 / 4) relevant values
const IV_MAX = 31;
const STATS = 6;

const facs = [1n];
for (let i = 1n, q = 1n; i < 135n; i = i + 1n) {
  q = q * i;
  facs.push(q);
}

const entryCount = (obj, toBigInt = true) => {
  const length = typeof obj == 'object' ? Object.keys(obj).length : 1;
  return toBigInt ? BigInt(length) : length;
};

const toID = (lookupName) =>
  lookupName.toLowerCase().replace(/[^a-z0-9]+/g,'');

const choose = (n, r) => {
  if (n < facs.length && r < facs.length) {
    return facs[n] / (facs[r] * facs[n - r]);
  }

  n = BigInt(n);
  if (r < facs.length) {
    let numerator = 1n;
    for (let i = 0n; i < r; i = i + 1n) {
      numerator *= n - i;
    }

    return numerator / facs[r];
  }

  new Error(`I fear no number, but that thing... ${r} ...it scares me`);
};

const toExp = (bigInt) => {
  const stringNum = bigInt.toString();
  const numDigits = stringNum.length;
  const expForm = stringNum[0] + '.' + stringNum.substr(1, 5);

  return `${expForm}*10^${numDigits - 1} (${stringNum})`;
};

const EVPossibilities = () => {
  const bars = STATS - 1;
  let totalPossibilities = 0n;
  let above255 = 0n;
  for (let i = 1; i < EV_MAX + 1; i++) {
    totalPossibilities += facs[i + bars] / (facs[i] * facs[bars]);
  }

  for (let i = Math.ceil(EV_MAX / 2); i < EV_MAX + 1; i++) {
    above255 += facs[i + bars - 1] / (facs[i] * facs[bars - 1]);
  }

  totalPossibilities -= above255;
  console.log('Total EV Possibilities:', toExp(totalPossibilities));
  return totalPossibilities;
};

const ItemPossibilities = () => {
  let totalItems = 2n; // 1 for the collection of useless items below and 1 for having no item
  Object.entries(Items).forEach(([item, details]) => {
    if (details.isNonstandard) return;

    if (details.name.endsWith(" Ball") ||
      details.name.endsWith(" Fossil") ||
      item.match(/TR\d\d/)) {
      return;
    }

    switch (item) {
      case 'belueberry':
      case 'blukberry':
      case 'bottlecap':
      case 'cornnberry':
      case 'dawnstone':
      case 'dragonscale':
      case 'dubiousdisc':
      case 'durinberry':
      case 'duskstone':
      case 'electirizer':
      case 'energypowder':
      case 'firestone':
      case 'goldbottlecap':
      case 'hondewberry':
      case 'icestone':
      case 'leafstone':
      case 'magmarizer':
      case 'magostberry':
      case 'moonstone':
      case 'nanabberry':
      case 'nomelberry':
      case 'oldamber':
      case 'ovalstone':
      case 'pamtreberry':
      case 'pinapberry':
      case 'pomegberry':
      case 'prismscale':
      case 'protector':
      case 'qualotberry':
      case 'rabutaberry':
      case 'razzberry':
      case 'reapercloth':
      case 'sachet':
      case 'shinystone':
      case 'spelonberry':
      case 'sunstone':
      case 'tamatoberry':
      case 'thunderstone':
      case 'upgrade':
      case 'waterstone':
      case 'watmelberry':
      case 'wepearberry':
      case 'whippeddream':
      case 'rarebone':
        return;
    }

    totalItems += 1n;
  });

  console.log('Total Item Possibilities:', toExp(totalItems));
  return totalItems;
};

const MonPossibilities = (totalItems, totalEVPos) => {
  let totalPossibilities = 0n;
  let totalMoves = 0;
  const names = Object.entries(FormatsData)
    .filter(([, p]) => p.isNonstandard != 'Custom' &&
     p.isNonstandard != 'Unobtainable' &&
    (p.tier && !p.tier.startsWith('CAP')))
    .map(([n]) => n);

  const constantsMulted = HAPPINESS_MAX * LEVELS_MAX * NATURES * BigInt(IV_MAX * STATS) * totalEVPos;
  const possibilitiesPerMon = names.map(name => {
    let totalMonPossibilities = 0n;

    let abilityCount = 0n;
    let moveCount = MOVE_COUNT_MAX - 1; // 1 for each potentially blank move slot
    let genderCount = 0n;
    let requiredItem = false;

    const dexData = Pokedex[name];

    if (dexData) {
      abilityCount = entryCount(dexData.abilities);
      requiredItem = !!dexData.requiredItem;
      if (dexData.genderRatio || !dexData.gender) {
        genderCount = 2n;
      }
      else {
        genderCount = 1n;
      }
    }
    else {
      abilityCount = 2n;
      genderCount = 2n;
      console.warn('This Pokemon has no data:', name); // This currently open happens with Rockruff-Dusk forme, which I don't think is real
    }

    let evoLevel = 1n;
    let learnset = [];

    const collectLearnset = () => {
      const filteredLearnset = (id) => {
        return new Set(Object.entries(Learnsets[id].learnset)
          .map(([move]) => move));
      };

      const baseLearnset = filteredLearnset(name);

      let currentDexData = Pokedex[name];
      while (currentDexData && currentDexData.prevo) {
        const prevoID = toID(currentDexData.prevo);
        if (!currentDexData.canHatch) {
          if (currentDexData.evoLevel) {
            const prevoLevel = BigInt(currentDexData.evoLevel);
            if (evoLevel < prevoLevel) evoLevel = prevoLevel;
          }
          else if (currentDexData.evoType === 'levelMove') {
            const learnMethod = Learnsets[toID(prevoID)].learnset[toID(currentDexData.evoMove)][0];
            const level = /\dL(\d+)/.exec(learnMethod);
            if (level) {
              evoLevel = BigInt(level[1]);
            }
          }
          else {
            evoLevel = 2n;
          }
        }

        filteredLearnset(prevoID).forEach(move => baseLearnset.add(move));

        currentDexData = Pokedex[prevoID];
      }

      learnset = baseLearnset;
    };

    const revertToSpecies = () => {
      name = toID(Pokedex[name].baseSpecies);
      if (!Learnsets[name].learnset) {
        console.warn('Has no learnset: ', name);
        return false;
      }

      collectLearnset();
      return true;
    };

    if (!Learnsets[name] || !Learnsets[name].learnset) {
      if (!revertToSpecies()) return;
    }
    else {
      collectLearnset();
    }

    if (!learnset.size) {
      if (!revertToSpecies()) return;
    }

    totalMoves += learnset.size;
    moveCount += learnset.size;
    totalMonPossibilities = constantsMulted * abilityCount * genderCount * (requiredItem ? 1n : totalItems);

    totalMonPossibilities *= choose(moveCount, MOVE_COUNT_MAX);

    totalMonPossibilities /= evoLevel;

    totalPossibilities += totalMonPossibilities;
    return totalMonPossibilities;
  });
  
  console.log('Total Pokemon Possibilities:', toExp(totalPossibilities));
  console.log('Average # of learnable moves:', totalMoves / names.length);
  return {totalMonPossibilities: totalPossibilities, possibilitiesPerMon};
};

const totalItems = ItemPossibilities();
const totalEVPos = EVPossibilities();
const {possibilitiesPerMon, totalMonPossibilities} = MonPossibilities(totalItems, totalEVPos);
const totalTeamPossibilities = choose(totalMonPossibilities, 6);

console.log('Total Team Possibilities:', toExp(totalTeamPossibilities));

const totalDuplicateMonPos = possibilitiesPerMon.reduce((total, totalPossibilities) => {
  const allOtherMons = totalMonPossibilities - totalPossibilities;
  for (let i = 2n; i <= 6n; i = i + 1n) {
    total += choose(totalPossibilities, i) * choose(allOtherMons, 6n - i);
  }

  return total;
}, 0n);

const onePerTeam = totalTeamPossibilities - totalDuplicateMonPos;
console.log('Total Team Possibilities (1 of each Pokémon per team):', toExp(onePerTeam));
console.log('Total Team Possibilities for Both Sides (1 of each Pokémon per team):', toExp(onePerTeam * onePerTeam));
