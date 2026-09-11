// Read-only production verification. Allow the existing Cloudflare build to finish.
// Check the source controls without claiming this HTTP check exercises playback.
const origin = 'https://callmedaddy.musicsubject.com';
const checks = [
  ['/from-sample-to-song/', ['I built the DAW.', 'https://suno.com/s/2G3yJwoXUfne8E5o', 'https://suno.com/s/GpMCfytHcBf7CAu4', 'id="seed-play"', 'id="seed-status"', 'href="/media/projects/2026/09/from-sample-to-song/suno_62bpm_4bar.mp3"', 'id="watch-process"', 'https://www.facebook.com/share/v/1FN8ky6Tvr/', 'id="facebook-sampling"', 'The sampling video is in the comments']],
  ['/data/briefing.js', ['project-from-sample-to-song', '/from-sample-to-song/']],
  ['/updates/project-from-sample-to-song/', ['property="og:title"', 'href="/from-sample-to-song/"']],
  ['/sitemap.xml', ['https://callmedaddy.musicsubject.com/from-sample-to-song/', 'https://callmedaddy.musicsubject.com/updates/project-from-sample-to-song/']],
  ['/from-sample-to-song/page.js', ['CMDContinuousPlayback.create', 'checkSource()', '[data-process-video]']],
  ['/from-sample-to-song/project.json', ['https://www.facebook.com/share/v/1FN8ky6Tvr/', '"location": "comments"']],
  ['/from-sample-to-song/style.css', ['.gd-diary', 'padding-bottom']]
];
let succeeded = false;
for (let attempt = 1; attempt <= 24; attempt++) {
  try {
    await Promise.all(checks.map(async ([path, markers]) => {
      const response = await fetch(origin + path, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      const text = await response.text();
      for (const marker of markers) {
        if (!text.includes(marker)) throw new Error(`${path}: expected content has not deployed`);
      }
      if (path === '/from-sample-to-song/' && /name="robots" content="noindex"/.test(text)) {
        throw new Error('Public diary still has draft noindex');
      }
    }));
    console.log('Production diary live checks passed: page, both supplied Suno hrefs, Facebook beat video and sampling-comments guidance, feed, update preview, sitemap, JS, CSS and project metadata.');
    console.log('Source controls and the original MP3 link are present; external video/audio playback, Facebook comment contents and physical-phone playback were not exercised.');
    succeeded = true;
    break;
  } catch (error) {
    console.log(`Deployment check ${attempt}/24: ${error.message}`);
    if (attempt < 24) await new Promise(resolve => setTimeout(resolve, 10000));
  }
}
if (!succeeded) {
  console.error('The public deployment was not verified within the polling window. Check Cloudflare deployment status before claiming the page is live.');
  process.exitCode = 1;
}
