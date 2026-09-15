// Kapselt alles rund um YouTube: Data-API-Suche (Song -> Video-ID)
// und den IFrame-Player, der blind (ohne sichtbare Infos) abspielt.

const YTM = (() => {
  const API_KEY_STORAGE = "sipster_yt_api_key";
  const CACHE_STORAGE = "sipster_video_cache";

  let apiKey = localStorage.getItem(API_KEY_STORAGE) || "";
  let videoIdCache = {};
  try {
    videoIdCache = JSON.parse(localStorage.getItem(CACHE_STORAGE) || "{}");
  } catch (e) {
    videoIdCache = {};
  }

  let player = null;
  let playerReady = false;
  let onReadyCallbacks = [];

  function cacheKey(song) {
    return `${song.artist}::${song.title}`.toLowerCase();
  }

  function saveCache() {
    localStorage.setItem(CACHE_STORAGE, JSON.stringify(videoIdCache));
  }

  function hasApiKey() {
    return !!apiKey;
  }

  function setApiKey(key) {
    apiKey = (key || "").trim();
    localStorage.setItem(API_KEY_STORAGE, apiKey);
  }

  function clearVideoCache() {
    videoIdCache = {};
    saveCache();
  }

  async function resolveVideoId(song) {
    const key = cacheKey(song);
    if (videoIdCache[key]) return videoIdCache[key];
    if (!apiKey) throw new Error("Kein YouTube-API-Key hinterlegt.");

    const q = encodeURIComponent(`${song.artist} ${song.title} audio`);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${q}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      let msg = `YouTube-Suche fehlgeschlagen (HTTP ${res.status})`;
      try {
        const body = await res.json();
        if (body?.error?.message) msg = body.error.message;
      } catch (e) {
        /* ignore */
      }
      throw new Error(msg);
    }
    const data = await res.json();
    const videoId = data.items && data.items[0] && data.items[0].id && data.items[0].id.videoId;
    if (!videoId) throw new Error("Kein passendes Video gefunden.");
    videoIdCache[key] = videoId;
    saveCache();
    return videoId;
  }

  // Wird vom globalen window.onYouTubeIframeAPIReady Callback aufgerufen,
  // sobald das YouTube IFrame Script geladen ist.
  function initPlayer(elementId) {
    player = new YT.Player(elementId, {
      height: "180",
      width: "320",
      playerVars: {
        controls: 0,
        modestbranding: 1,
        rel: 0,
        fs: 0,
        disablekb: 1,
        iv_load_policy: 3,
        playsinline: 1,
      },
      events: {
        onReady: () => {
          playerReady = true;
          onReadyCallbacks.forEach((cb) => cb());
          onReadyCallbacks = [];
        },
      },
    });
  }

  function whenReady(cb) {
    if (playerReady) cb();
    else onReadyCallbacks.push(cb);
  }

  function loadAndPlay(videoId) {
    if (!player) return;
    player.loadVideoById(videoId);
  }

  function play() {
    if (player) player.playVideo();
  }

  function pause() {
    if (player) player.pauseVideo();
  }

  function stop() {
    if (player) player.stopVideo();
  }

  return {
    hasApiKey,
    setApiKey,
    clearVideoCache,
    resolveVideoId,
    initPlayer,
    whenReady,
    loadAndPlay,
    play,
    pause,
    stop,
  };
})();

// Namespace, in den das YouTube-IFrame-Script global hineinruft.
window.onYouTubeIframeAPIReady = function () {
  YTM.initPlayer("ytPlayer");
};
