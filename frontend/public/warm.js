// Starts the landing page's first price request during HTML parse, so it does not wait on the
// bundle. The URL must match what fetchSpotPrices builds, or nothing adopts it.
(function () {
  var base = document.currentScript && document.currentScript.dataset.api;
  if (!base || base.charAt(0) === '%') return;

  // Below MOBILE_QUERY (src/lib/media.ts) nothing is preselected, so nothing would adopt this.
  if (window.matchMedia('(max-width: 900px)').matches) return;

  var d = new Date();
  var p = function (n) {
    return n < 10 ? '0' + n : '' + n;
  };
  var date = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());

  var url = base + '/api/spotprices?biddingZoneId=7&date=' + date;
  window.__warmPrices = {
    url: url,
    promise: fetch(url)
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .catch(function () {
        return null;
      }),
  };
})();
