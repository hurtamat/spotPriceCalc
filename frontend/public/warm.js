// Starts the landing page's first price request while the bundle is still downloading, so it does
// not wait on it. The date must match dateForDay('today') in api/spotPrices.ts or nothing adopts it.
(function () {
  var base = document.currentScript && document.currentScript.dataset.api;
  if (!base || base.charAt(0) === '%') return;

  // Below PriceSection's MOBILE_QUERY nothing is preselected, so this would never be adopted.
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
