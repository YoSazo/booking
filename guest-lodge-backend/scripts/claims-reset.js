'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const DEFAULT_HOURS = 48;
const PRICE = 49;

function resetClaimsLaunch({ backendRoot = path.resolve(__dirname, '..'), hours = DEFAULT_HOURS, now = Date.now(), dryRun = false } = {}) {
  if (!Number.isInteger(hours) || hours < 1 || hours > 8760) throw new Error('--hours must be a whole number from 1 to 8760.');
  if (!Number.isFinite(now)) throw new Error('Invalid start time.');
  // Terms state the deadline to the minute, so round up to that same minute.
  const until = new Date(Math.ceil((now + hours * 3600000) / 60000) * 60000).toISOString().replace('.000Z', 'Z');
  const date = new Date(until);
  const zone = { timeZone: 'America/Los_Angeles' };
  const day = date.toLocaleDateString('en-US', { ...zone, month: 'long', day: 'numeric', year: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { ...zone, hour: 'numeric', minute: '2-digit', hour12: true }).replace(/[\u00a0\u202f]/g, ' ');
  const deadline = `${time} Pacific on ${day}`;
  const web = path.join(backendRoot, 'public/inspect');
  const ios = path.resolve(backendRoot, '../marketel-frontdesk-ios/www');
  const manifestPath = path.join(backendRoot, 'wedges/claims.js');
  delete require.cache[require.resolve(manifestPath)];
  const manifest = structuredClone(require(manifestPath));
  manifest.offer.launch = { price: PRICE, until };
  const introPattern = /(pay-once purchase )\([^)]*\)/;
  if (!introPattern.test(manifest.termsIntro)) throw new Error('Claims termsIntro has changed; update the reset command before using it.');
  manifest.termsIntro = manifest.termsIntro.replace(introPattern, (_, prefix) => `${prefix}($${PRICE} at the launch price until ${deadline}, then $${manifest.offer.lifetime})`);
  const { validate } = require(path.join(backendRoot, 'wedges/registry'));
  validate(manifest);

  const indexPath = path.join(web, 'index.html');
  const termsPath = path.join(web, 'terms.html');
  const index = fs.readFileSync(indexPath, 'utf8');
  const terms = fs.readFileSync(termsPath, 'utf8');
  if (index !== fs.readFileSync(path.join(ios, 'inspect/index.html'), 'utf8') || terms !== fs.readFileSync(path.join(ios, 'inspect/terms.html'), 'utf8')) {
    throw new Error('Web and iOS index/terms copies must match before resetting the offer.');
  }
  const versions = [...index.matchAll(/\/inspect\/(?:inspect\.css|inspect\.js|wedges\.js)\?v=(\d+)/g)].map(match => Number(match[1]));
  if (versions.length !== 3 || new Set(versions).size !== 1) throw new Error('Expected three matching Inspect asset versions.');
  const version = versions[0] + 1;
  const nextIndex = index.replace(/(\/inspect\/(?:inspect\.css|inspect\.js|wedges\.js)\?v=)\d+/g, (_, prefix) => prefix + version);
  const termsPattern = /<p>Where a Marketel tool offers it,[\s\S]*?<\/p>/;
  if (!termsPattern.test(terms)) throw new Error('The pay-once terms paragraph has changed; update the reset command before using it.');
  const nextTerms = terms.replace(termsPattern, () => `<p>Where a Marketel tool offers it, access is also sold for a single payment ("pay once") at the price shown before checkout; for Marketel Claims that is $${manifest.offer.lifetime} USD, or $${PRICE} USD at its launch price until ${deadline}. A launch price ends at that stated time for everyone.</p>`);
  const writes = new Map([
    [manifestPath, `'use strict';\nmodule.exports = ${JSON.stringify(manifest, null, 2)};\n`],
    [indexPath, nextIndex], [path.join(ios, 'inspect/index.html'), nextIndex],
    [termsPath, nextTerms], [path.join(ios, 'inspect/terms.html'), nextTerms],
  ]);
  const originals = new Map([...writes.keys(), path.join(web, 'wedges.js'), path.join(ios, 'inspect/wedges.js'), path.join(ios, 'index.html')]
    .map(file => [file, fs.readFileSync(file)]));
  const result = { price: PRICE, fullPrice: manifest.offer.lifetime, hours, until, deadline, version, dryRun };
  if (dryRun) return result;
  try {
    for (const [file, content] of writes) fs.writeFileSync(file, content);
    const builder = path.join(backendRoot, 'scripts/wedges-build.js');
    execFileSync(process.execPath, [builder], { cwd: backendRoot, stdio: 'pipe' });
    execFileSync(process.execPath, [builder, '--check'], { cwd: backendRoot, stdio: 'pipe' });
  } catch (error) {
    for (const [file, content] of originals) fs.writeFileSync(file, content);
    throw new Error('Could not reset the Claims offer. All changes were restored.', { cause: error });
  }
  return result;
}

function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--hours') options.hours = Number(args[++i]);
    else if (args[i] === '--dry-run') options.dryRun = true;
    else if (args[i] === '--help' || args[i] === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${args[i]}. Use --help.`);
  }
  return options;
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) console.log('Usage: npm run claims:reset -- [--hours 48] [--dry-run]\nRestores $49 for a new fixed offer window (default: 48 hours). Does not commit or push.');
    else {
      const result = resetClaimsLaunch(options);
      console.log(`${result.dryRun ? 'Preview' : 'Updated'}: Claims $${result.price} for ${result.hours} hours, then $${result.fullPrice}.\nEnds ${result.deadline}\nUTC deadline: ${result.until}`);
      console.log(result.dryRun ? 'No files changed.' : 'Web/iOS data, terms and asset versions updated. Commit and deploy these changes to activate the offer. Nothing was pushed.');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { resetClaimsLaunch, parseArgs };
