(function () {
    function showSystemDown(imageUrl) {
        if (document.getElementById('system-down-overlay')) return;
        const div = document.createElement('div');
        div.id = 'system-down-overlay';
        div.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999999;background:black;display:flex;align-items:center;justify-content:center;';
        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
            div.appendChild(img);
        }
        document.body.appendChild(div);
    }

    // Check status on load
    fetch('/api/method/goldretail.api.system.get_system_status')
        .then(r => r.json())
        .then(data => {
            const state = data.message || data;
            if (state.is_down) {
                showSystemDown(state.image_url);
            }
        })
        .catch(console.error);

    // Listen to real-time event if Frappe socket is available
    let attempts = 0;
    function initRealtime() {
        if (window.frappe && frappe.realtime && frappe.realtime.socket) {
            frappe.realtime.on('system_down_toggled', function (data) {
                if (data.is_down) {
                    showSystemDown(data.image_url);
                } else {
                    const el = document.getElementById('system-down-overlay');
                    if (el) el.remove();
                }
            });
        } else if (attempts < 20) { // Try for 10 seconds
            attempts++;
            setTimeout(initRealtime, 500);
        }
    }

    // Start listening process
    if (document.readyState === 'complete') {
        initRealtime();
    } else {
        window.addEventListener('load', initRealtime);
    }
})();
