/**
 * Zwei Figuren im neuen Vokabular, zum Danebenhalten.
 *
 * Sie beantworten eine einzige Frage: liegt der Minecraft-Eindruck an der
 * Darstellung oder an den Modellen? Deshalb sind sie nicht schoener
 * gezeichnet als die vorhandenen, sondern nur aus anderen Grundkoerpern
 * zusammengesetzt - Eiern und Wuersten statt Quadern. Alles andere,
 * Material, Licht und Huellenbau, ist dasselbe.
 *
 * Gebaut wird in Voxeln wie ueberall, damit sich die Groessen direkt
 * vergleichen lassen. Absicht ist ausserdem die kleine Unsauberkeit: nichts
 * sitzt genau mittig, nichts ist genau gleich gross. Eine von Hand geknetete
 * Figur ist nie symmetrisch, und das Auge merkt das noch vor der Form.
 */

import type { RohModell } from './meshbau';

export const BAUM_KNET: RohModell = {
  id: 'baum_knet',
  parts: [
    {
      name: 'stamm',
      pivot: [0, 0, 0],
      boxes: [
        { pos: [0, 1.5, 0], size: [11, 4, 10], color: '#6b5236', art: 'ei', grain: 0.1 },
        { pos: [0.4, 9, -0.3], size: [5.5, 18, 5], color: '#7a5f3e', art: 'wurst', achse: 'y', grain: 0.09 },
      ],
    },
    {
      name: 'krone',
      pivot: [0, 0, 0],
      bob: { amp: 0.25, phase: 0 },
      boxes: [
        { pos: [0, 23, 0], size: [21, 15, 19], color: '#5c8a3e', art: 'ei', grain: 0.14 },
        { pos: [-6.5, 27.5, 3], size: [14, 12, 13], color: '#679a45', art: 'ei', grain: 0.14 },
        { pos: [6, 26, -3.5], size: [12.5, 11, 12], color: '#537f38', art: 'ei', grain: 0.14 },
        { pos: [1, 18.5, 6], size: [10, 8, 9], color: '#4e7834', art: 'ei', grain: 0.13 },
      ],
    },
  ],
};

export const FIGUR_KNET: RohModell = {
  id: 'figur_knet',
  parts: [
    {
      name: 'beinLinks',
      pivot: [-3, 11, 0],
      swing: { axis: 'x', amp: 0.42, phase: 0 },
      boxes: [
        { pos: [-3, 6, 0], size: [5.5, 12, 5.5], color: '#7a6a52', art: 'wurst', achse: 'y' },
        { pos: [-3.2, 1.5, 1.5], size: [7, 4, 9], color: '#5e5040', art: 'ei' },
      ],
    },
    {
      name: 'beinRechts',
      pivot: [3, 11, 0],
      swing: { axis: 'x', amp: 0.42, phase: Math.PI },
      boxes: [
        { pos: [3, 6, 0], size: [5.5, 12, 5.5], color: '#7a6a52', art: 'wurst', achse: 'y' },
        { pos: [3.1, 1.5, 1.4], size: [7, 4, 9], color: '#5e5040', art: 'ei' },
      ],
    },
    {
      name: 'rumpf',
      pivot: [0, 12, 0],
      bob: { amp: 0.4, phase: Math.PI / 2 },
      boxes: [
        { pos: [0, 16, 0], size: [16, 15, 13], color: '#b8ac92', art: 'ei', grain: 0.11 },
        // Kopf deutlich zu gross, Koerper zu klein: das ist der Griff, mit
        // dem Knetfiguren ihren Ausdruck bekommen.
        { pos: [0.3, 27, 0.5], size: [19, 17, 17], color: '#c6bb9f', art: 'ei', grain: 0.11 },
        { pos: [0, 25.5, 8], size: [10, 8, 8], color: '#bdb092', art: 'ei', grain: 0.1 },
        { pos: [-4.3, 30, 6], size: [6.5, 7.5, 6], color: '#f4f0e6', art: 'ei', grain: 0.04 },
        { pos: [4.5, 30.2, 6], size: [6, 7, 5.5], color: '#f4f0e6', art: 'ei', grain: 0.04 },
        { pos: [-4.4, 30, 8.4], size: [3, 3.4, 3], color: '#1a1712', art: 'ei', grain: 0.02 },
        { pos: [4.6, 30.2, 8.2], size: [2.8, 3.2, 2.8], color: '#1a1712', art: 'ei', grain: 0.02 },
        { pos: [-8.5, 34.5, -1], size: [5, 9, 4], color: '#b0a488', art: 'ei' },
        { pos: [8.8, 34, -1.2], size: [4.8, 8.5, 4], color: '#b0a488', art: 'ei' },
      ],
    },
    {
      name: 'armLinks',
      pivot: [-8, 21, 0],
      swing: { axis: 'x', amp: 0.34, phase: Math.PI },
      boxes: [{ pos: [-8.5, 16, 1], size: [4.5, 11, 4.5], color: '#a2977e', art: 'wurst', achse: 'y' }],
    },
    {
      name: 'armRechts',
      pivot: [8, 21, 0],
      swing: { axis: 'x', amp: 0.34, phase: 0 },
      boxes: [{ pos: [8.4, 16, 1], size: [4.5, 11, 4.5], color: '#a2977e', art: 'wurst', achse: 'y' }],
    },
  ],
};
