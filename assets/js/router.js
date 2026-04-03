/* ============================================
   ROUTER MODULE (Hash-based Routing)
   ============================================ */

const Router = (() => {
    let currentRoute = '';

    function parseHash() {
        const hash = window.location.hash.slice(1) || 'home';
        const [path, queryString] = hash.split('?');
        const params = {};

        if (queryString) {
            queryString.split('&').forEach(pair => {
                const [key, val] = pair.split('=');
                params[decodeURIComponent(key)] = decodeURIComponent(val || '');
            });
        }

        const segments = path.split('/').filter(Boolean);

        return { path, segments, params, raw: hash };
    }

    function navigate(hash) {
        window.location.hash = hash;
    }

    function init(routeHandler) {
        const handleRoute = () => {
            const route = parseHash();
            
            // Avoid re-rendering the same route
            if (route.raw === currentRoute) return;
            currentRoute = route.raw;

            routeHandler(route);
        };

        window.addEventListener('hashchange', handleRoute);
        // Initial route
        handleRoute();
    }

    function getCurrentRoute() {
        return parseHash();
    }

    return {
        parseHash,
        navigate,
        init,
        getCurrentRoute,
    };
})();
