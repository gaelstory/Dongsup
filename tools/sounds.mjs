// Cuts the demo's five ambience loops from the Sonniss GDC bundles and writes them to public/audio/. They are not
// in this repo: MISSING_ASSETS.md says why, and where the bundles are.
//
//   SONNISS_DIR=<folder> node tools/sounds.mjs
//
// <folder> holds the bundles laid out <year>/<library folder>/<file>, with the names below. Needs ffmpeg with
// libvorbis on the path. A recording it can't find is skipped, and it says which.
// Each loop is 36 s of the recording from `from` seconds in, brought to one loudness, with its last 3 s faded
// across its first 3 s so it joins itself: 33 s.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOUNDS = [
  {
    id: 'summer',
    what: 'A summer evening on a hill: birds, insects, quiet air',
    year: 2018,
    library: 'Alexander Kopeikin - Quad ambience of Crimea in summer',
    file: '09 vineyard evening ambience, hill, very quiet, birds, crickets, take 2, ortf offset 5 m, front - ORTF.wav',
    from: 40,
    loudness: -26,
  },
  {
    id: 'leaves',
    what: 'Wind in tree tops, heard under a tree',
    year: 2018,
    library: 'Alexander Kopeikin - Quad ambience of Crimea in summer',
    file: '28 lake, high wind in tree tops, birds, daytime - QUAD XY LR.wav',
    from: 60,
    loudness: -24,
  },
  {
    id: 'crickets',
    what: 'Crickets in a meadow at night, as the light goes',
    year: 2018,
    library: 'Alexander Kopeikin - Quad ambience of Crimea in summer',
    file: '20 meadow night ambience, crickets, ortf offset by 3 m, front - ORTF.wav',
    from: 30,
    loudness: -26,
  },
  {
    id: 'grass',
    what: 'A breeze in tall grass',
    year: 2017,
    library: 'Hzandbits - Wind In Trees',
    file: 'Wind,Ext,Breeze,Grass,Tall,Rustle,Buffeting.wav',
    from: 20,
    loudness: -24,
  },
  {
    id: 'lake',
    what: 'Small waves at the bank of a lake',
    year: 2019,
    library: 'BlueZone - Lake Wave Sound Effects',
    file: 'Bluezone_BC0252_lake_wave_ambience_04.wav',
    from: 8,
    loudness: -26,
  },
];

const here = path.dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.env.SONNISS_DIR;
  if (!root) throw new Error('set SONNISS_DIR to the folder the bundles are in');
  const out = path.join(here, '..', 'public', 'audio');
  fs.mkdirSync(out, { recursive: true });
  const take = path.join(os.tmpdir(), `painted-valley-take-${process.pid}.wav`);
  const ffmpeg = (...args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
  for (const s of SOUNDS) {
    const source = path.join(root, String(s.year), s.library, s.file);
    if (!fs.existsSync(source)) {
      console.log(`not found, skipped: ${s.id} (${source})`);
      continue;
    }
    ffmpeg('-ss', String(s.from), '-t', '36', '-i', source, '-af', `aresample=44100,loudnorm=I=${s.loudness}:TP=-3,aresample=44100`, '-ac', '2', take);
    // the take is opened twice: its body from 3 s on, and its first 3 s to fade in over the body's end
    ffmpeg('-ss', '3', '-i', take, '-t', '3', '-i', take, '-filter_complex', '[0][1]acrossfade=d=3:c1=tri:c2=tri', '-c:a', 'libvorbis', '-q:a', '4', path.join(out, `${s.id}.ogg`));
    console.log(`wrote public/audio/${s.id}.ogg`);
  }
  fs.rmSync(take, { force: true });
}
