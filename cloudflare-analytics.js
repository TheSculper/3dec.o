(function () {
    const token = window.CLOUDFLARE_WEB_ANALYTICS_TOKEN;
    if (typeof token !== 'string' || token.trim() === '') return;

    const beacon = document.createElement('script');
    beacon.type = 'module';
    beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    beacon.dataset.cfBeacon = JSON.stringify({ token: token.trim() });
    document.body.appendChild(beacon);
})();
