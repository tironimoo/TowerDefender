/**
 * Pruefung der Inhaltsdateien.
 *
 * Ein Tippfehler in einer Gegnerdatei soll sofort als klare Meldung auffallen
 * und nicht als seltsames Verhalten im Spiel enden. Siehe
 * docs/03-architektur.md, Abschnitt Qualitaetssicherung.
 */

import type { Content } from '@sim/model/types';

export function validateContent(content: Content): string[] {
  const problems: string[] = [];

  for (const tower of content.towers.values()) {
    const where = `Turm ${tower.id}`;
    if (tower.cost <= 0) problems.push(`${where}: Kosten muessen groesser als null sein.`);
    if (tower.range <= 0) problems.push(`${where}: Reichweite muss groesser als null sein.`);
    if (tower.fireRate < 0) problems.push(`${where}: Feuerrate darf nicht negativ sein.`);
    if (tower.damage < 0) problems.push(`${where}: Schaden darf nicht negativ sein.`);
    if (tower.armorPierce < 0 || tower.armorPierce > 1) {
      problems.push(`${where}: Durchschlag muss zwischen null und eins liegen.`);
    }
    if (tower.onHit.slowFactor < 0 || tower.onHit.slowFactor > 1) {
      problems.push(`${where}: Verlangsamung muss zwischen null und eins liegen.`);
    }
    if (tower.upgrades.length === 0) problems.push(`${where}: keine Ausbaustufen.`);
    const hasEffect =
      tower.onHit.slowFactor > 0 || tower.onHit.burnDps > 0 || tower.onHit.burnDuration > 0;
    if (tower.damage === 0 && !hasEffect && tower.fireRate > 0) {
      problems.push(`${where}: feuert, richtet aber weder Schaden noch Wirkung an.`);
    }
    if (tower.fireRate > 0 && tower.projectileModel === '') {
      problems.push(`${where}: feuert ohne Geschossmodell.`);
    }
    if (tower.special.kind === 'aura' && tower.fireRate > 0) {
      problems.push(`${where}: Unterstuetzungstuerme feuern nicht.`);
    }
  }

  for (const enemy of content.enemies.values()) {
    const where = `Gegner ${enemy.id}`;
    if (enemy.health <= 0) problems.push(`${where}: Leben muss groesser als null sein.`);
    if (enemy.speed <= 0) problems.push(`${where}: Tempo muss groesser als null sein.`);
    if (enemy.gold < 0) problems.push(`${where}: Gold darf nicht negativ sein.`);
    if (enemy.behaviour.kind === 'teilt' && !content.enemies.has(enemy.behaviour.childId)) {
      problems.push(`${where}: teilt sich in unbekannten Gegner ${enemy.behaviour.childId}.`);
    }
    if (enemy.boss !== null) {
      let vorher = Number.POSITIVE_INFINITY;
      for (const phase of enemy.boss.phasen) {
        if (phase.abLebensanteil >= vorher) {
          problems.push(`${where}: Bossphasen muessen absteigend angegeben sein.`);
        }
        vorher = phase.abLebensanteil;
        if (phase.ruft !== null && !content.enemies.has(phase.ruft.enemyId)) {
          problems.push(`${where}: ruft unbekannten Gegner ${phase.ruft.enemyId}.`);
        }
      }
    }
  }

  for (const level of content.levels.values()) {
    const where = `Level ${level.id}`;
    if (level.paths.length === 0) problems.push(`${where}: kein Weg vorhanden.`);
    level.paths.forEach((path, index) => {
      if (path.length < 2) problems.push(`${where}: Weg ${index} hat weniger als zwei Punkte.`);
    });
    if (level.buildSlots.length === 0) problems.push(`${where}: keine Bauplaetze.`);
    if (level.lives <= 0) problems.push(`${where}: Leben muessen groesser als null sein.`);
    if (level.startGold < 0) problems.push(`${where}: Startgold darf nicht negativ sein.`);
    if (level.waves.length === 0) problems.push(`${where}: keine Wellen.`);
    if (level.breite <= 0 || level.hoehe <= 0) problems.push(`${where}: Karte ohne Groesse.`);
    if (level.albtraumMutator !== '' && !content.mutators.has(level.albtraumMutator)) {
      problems.push(`${where}: unbekannter Mutator ${level.albtraumMutator}.`);
    }
    if (!level.buildSlots.some((slot) => !slot.aufWeg)) {
      problems.push(`${where}: kein Bauplatz neben dem Weg.`);
    }

    level.waves.forEach((wave, waveIndex) => {
      const waveWhere = `${where}, Welle ${waveIndex + 1}`;
      if (wave.groups.length === 0) problems.push(`${waveWhere}: keine Gruppen.`);
      for (const group of wave.groups) {
        if (!content.enemies.has(group.enemyId)) {
          problems.push(`${waveWhere}: unbekannter Gegner ${group.enemyId}.`);
        }
        if (group.count <= 0) problems.push(`${waveWhere}: Anzahl muss groesser als null sein.`);
        if (group.spacing <= 0) problems.push(`${waveWhere}: Abstand muss groesser als null sein.`);
        if (group.delay < 0) problems.push(`${waveWhere}: Verzoegerung darf nicht negativ sein.`);
        if (group.pathIndex < 0 || group.pathIndex >= level.paths.length) {
          problems.push(`${waveWhere}: Weg ${group.pathIndex} gibt es nicht.`);
        }
      }
    });
  }

  return problems;
}
